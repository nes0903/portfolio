import { access, readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * verifier 파일을 기준으로 front 정적 export 디렉터리를 결정한다.
 */
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const frontDirectory = resolve(scriptDirectory, "..");
const outDirectory = resolve(scriptDirectory, "../out");
const backendDirectory = resolve(frontDirectory, "../backend");
const repositoryDirectory = resolve(frontDirectory, "..");
const indexPath = join(outDirectory, "index.html");

/**
 * 원본 backend 콘텐츠로 취급해 정적 산출물에서 금지하는 파일명 목록.
 */
const rawContentFileNames = new Set([
  "introduce.json",
  "skill.json",
  "career.json",
  "career-work.json",
  "side-project.json",
  "contact.json",
]);

/**
 * 일반 manifest JSON과 구분할 수 있는 portfolio 원본 객체 key fingerprint.
 */
const rawPortfolioFingerprints = [
  ["id", "name", "category", "order"],
  ["id", "company", "role", "startDate", "endDate", "order"],
  ["id", "careerId", "title", "description", "order"],
  ["id", "name", "description", "role", "skills", "links", "order"],
  ["id", "channel", "label", "value", "url", "order"],
];

/**
 * 강한 credential signature만 검사해 일반 포트폴리오 문구의 오탐을 피한다.
 */
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  /\bsk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{24,}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /\b(?:api[-_ ]?key|access[-_ ]?token|client[-_ ]?secret|password)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{16,}/i,
];

/**
 * 승인된 [NAME] 표시는 허용하고 미승인 PII placeholder와 주민번호를 차단한다.
 */
const piiPatterns = [
  /\b(?:YOUR|TODO|REPLACE_ME)[-_ ]?(?:EMAIL|PHONE|ADDRESS|NAME)\b/i,
  /<(?:email|phone|address|name)>/i,
  /\b(?:user|name|hello)@example\.com\b/i,
  /\b010-0000-0000\b/,
  /\b01[016789][ -]?\d{3,4}[ -]?\d{4}\b/,
  /\b\d{6}-[1-4]\d{6}\b/,
  /\bhttps?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|\[::1\])(?:[/:]|$)/i,
];

/**
 * 공개 source와 artifact에서 승인 여부를 대조할 일반 email 주소 패턴.
 */
const emailAddressPattern =
  /[A-Z0-9.!#$%&'*+/^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)*\.[A-Z]{2,63}\b/gi;

/**
 * JavaScript literal에서 실제 파일 참조로 취급할 정적 asset 확장자.
 */
const runtimeAssetPathPattern =
  /(?:\/_next\/static\/|\.(?:avif|css|gif|ico|jpe?g|js|json|mjs|cjs|png|svg|wasm|webp|woff2?|ttf|otf))(?:[?#].*)?$/i;

/**
 * browser bundle에 들어갈 수 없는 server-only loader source signature.
 */
const serverSourcePatterns = [
  /(?:import\s+|require\(\s*)["']server-only["']/,
  /path\.resolve\([^)]*["'][^"']*backend["']/,
  /readFile\([^)]*["'](?:introduce|skill|career|career-work|side-project|contact)\.json["']/,
];

/**
 * 환경 변수의 공백과 양끝 slash를 제거해 GitHub Pages base path로 정규화한다.
 */
function normalizeBasePath(rawBasePath) {
  const normalizedPath =
    rawBasePath?.trim().replace(/^\/+|\/+$/g, "") ?? "";

  return normalizedPath === "" ? "" : `/${normalizedPath}`;
}

/**
 * 정적 export 아래의 모든 일반 파일을 재귀적으로 수집한다.
 */
async function listFiles(directory, rejectSymlinks = false) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name);

      if (entry.isSymbolicLink()) {
        if (rejectSymlinks) {
          throw new Error(
            `symlink가 정적 산출물에 포함되었습니다: ${relative(outDirectory, entryPath)}`,
          );
        }

        return [];
      }

      /**
       * 디렉터리는 재귀 탐색하고 일반 파일만 검증 대상으로 반환한다.
       */
      if (entry.isDirectory()) {
        return listFiles(entryPath, rejectSymlinks);
      }

      return entry.isFile() ? [entryPath] : [];
    }),
  );

  return nestedFiles.flat();
}

/**
 * backend, Git metadata, source map, 원본 콘텐츠 파일, 민감 파일명을 검사한다.
 */
function verifyArtifactPaths(files) {
  /**
   * 모든 경로를 out 기준 상대 경로로 바꿔 금지 segment와 파일명을 비교한다.
   */
  for (const file of files) {
    const relativePath = relative(outDirectory, file);
    const segments = relativePath.split(sep);
    const normalizedSegments = segments.map((segment) => segment.toLowerCase());
    const fileName = normalizedSegments.at(-1) ?? "";

    if (
      normalizedSegments.includes("backend") ||
      normalizedSegments.includes(".git")
    ) {
      throw new Error(`금지된 디렉터리가 정적 산출물에 포함되었습니다: ${relativePath}`);
    }

    if (extname(fileName) === ".map") {
      throw new Error(`source map이 정적 산출물에 포함되었습니다: ${relativePath}`);
    }

    if (rawContentFileNames.has(fileName)) {
      throw new Error(`원본 콘텐츠 파일이 정적 산출물에 포함되었습니다: ${relativePath}`);
    }

    /**
     * extension이 붙은 env 파일과 secret/credential/private-key 이름도 차단한다.
     */
    if (
      normalizedSegments.some(
        (segment) =>
          segment === ".env" ||
          segment.startsWith(".env.") ||
          /\.(?:key|pem|p12|pfx)$/i.test(segment) ||
          /(?:^|[._-])(?:secret|secrets|credentials?|private[-_]?key)(?:$|[._-])/i.test(
            segment,
          ),
      )
    ) {
      throw new Error(`민감한 이름의 파일이 정적 산출물에 포함되었습니다: ${relativePath}`);
    }
  }
}

/**
 * top-level 배열 item이 portfolio 원본 객체 fingerprint를 갖는지 검사한다.
 */
function hasRawPortfolioFingerprint(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const keys = new Set(Object.keys(value));

  return rawPortfolioFingerprints.some((fingerprint) =>
    fingerprint.every((key) => keys.has(key)),
  );
}

/**
 * JSON object key 순서를 정렬해 의미가 같은 payload를 동일 문자열로 만든다.
 */
function canonicalizeJson(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, nestedValue]) => [key, canonicalizeJson(nestedValue)]),
  );
}

/**
 * JSON 값을 안정적인 canonical 비교 문자열로 직렬화한다.
 */
function serializeCanonicalJson(value) {
  return JSON.stringify(canonicalizeJson(value));
}

/**
 * JavaScript와 JSON source에서 흔히 쓰는 escape를 실행 없이 평문으로 복원한다.
 */
function decodeEscapedText(value) {
  const simpleEscapes = {
    "0": "\0",
    b: "\b",
    f: "\f",
    n: "\n",
    r: "\r",
    t: "\t",
    v: "\v",
  };

  return value
    .replace(/\\u\{([0-9a-f]{1,6})\}/gi, (_match, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replace(/\\u([0-9a-f]{4})/gi, (_match, codePoint) =>
      String.fromCharCode(Number.parseInt(codePoint, 16)),
    )
    .replace(/\\x([0-9a-f]{2})/gi, (_match, codePoint) =>
      String.fromCharCode(Number.parseInt(codePoint, 16)),
    )
    .replace(/\\([0bfnrtv])/g, (_match, escapeName) =>
      simpleEscapes[escapeName],
    )
    .replace(/\\(["'`\\/])/g, "$1");
}

/**
 * wrapper 안의 balanced JSON object와 array 후보를 모두 추출한다.
 */
function extractEmbeddedJsonValues(content, inspectEscapedStrings = true) {
  const parsedValues = [];
  const stack = [];
  let activeQuote;
  let escaped = false;

  /**
   * 한 번의 순회로 중첩 container를 닫는 시점마다 독립적인 JSON parse를 시도한다.
   */
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (activeQuote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === activeQuote) {
        activeQuote = undefined;
      }

      continue;
    }

    /**
     * JSON container 안의 문자열 경계는 double quote만 사용한다. 일반 문장의
     * apostrophe가 이후 payload 탐지를 막지 않도록 JS quote 상태와 분리한다.
     */
    if (character === '"') {
      activeQuote = character;
      continue;
    }

    if (character === "{" || character === "[") {
      stack.push({
        closingCharacter: character === "{" ? "}" : "]",
        startIndex: index,
      });
      continue;
    }

    if (character !== "}" && character !== "]") {
      continue;
    }

    const frame = stack.at(-1);

    if (!frame || frame.closingCharacter !== character) {
      stack.length = 0;
      continue;
    }

    stack.pop();

    try {
      parsedValues.push(
        JSON.parse(content.slice(frame.startIndex, index + 1)),
      );
    } catch {
      // JavaScript block나 CSS 문법처럼 JSON이 아닌 balanced container는 무시한다.
    }
  }

  /**
   * JavaScript string에 escape된 JSON도 quote 종류와 무관하게 한 단계 복원한다.
   */
  if (inspectEscapedStrings) {
    for (const match of content.matchAll(/(["'`])((?:\\[\s\S]|(?!\1)[^\\])*)\1/g)) {
      const rawValue = match[2];

      if (rawValue === undefined || !/[\[{]/.test(rawValue)) {
        continue;
      }

      const decodedValue = decodeEscapedText(rawValue);

      if (decodedValue !== rawValue) {
        parsedValues.push(
          ...extractEmbeddedJsonValues(decodedValue, false),
        );
      }
    }
  }

  return parsedValues;
}

/**
 * 빈 container는 wrapper 안에서 일반 코드와 구분할 수 없으므로 embedded 비교에서 제외한다.
 */
function isDistinctEmbeddedPayload(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length > 0
  );
}

/**
 * parse 가능한 JSON이면 backend 원본과 동일한 payload 또는 top-level raw 배열을 차단한다.
 */
function assertNoRawPortfolioJson(
  content,
  relativePath,
  canonicalJsonValues,
  embeddedCanonicalJsonValues,
) {
  let parsed;
  let parsedWholeFile = true;

  try {
    parsed = JSON.parse(content);
  } catch {
    parsedWholeFile = false;
  }

  if (parsedWholeFile) {
    const normalizedJson = serializeCanonicalJson(parsed);

    if (canonicalJsonValues.has(normalizedJson)) {
      throw new Error(`backend 원본 JSON과 동일한 artifact가 노출되었습니다: ${relativePath}`);
    }

    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.some(hasRawPortfolioFingerprint)
    ) {
      throw new Error(`portfolio 원본 JSON fingerprint가 노출되었습니다: ${relativePath}`);
    }
  }

  /**
   * 전체 파일이 JSON이 아니어도 wrapper 안의 canonical object와 array를 비교한다.
   */
  for (const embeddedValue of extractEmbeddedJsonValues(content)) {
    if (
      embeddedCanonicalJsonValues.has(
        serializeCanonicalJson(embeddedValue),
      )
    ) {
      throw new Error(`backend canonical JSON이 wrapper 안에 노출되었습니다: ${relativePath}`);
    }
  }
}

/**
 * canonical backend JSON과 공개가 승인된 contact 값을 읽는다.
 */
async function loadBackendContract() {
  const canonicalJsonValues = new Set();
  const embeddedCanonicalJsonValues = new Set();
  const approvedContactValues = new Set();
  const approvedEmailAddresses = new Set();

  for (const fileName of rawContentFileNames) {
    const filePath = join(backendDirectory, fileName);
    const content = await readFile(filePath, "utf8");
    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`backend JSON을 해석할 수 없습니다: ${fileName}`);
    }

    const canonicalJson = serializeCanonicalJson(parsed);
    canonicalJsonValues.add(canonicalJson);

    if (isDistinctEmbeddedPayload(parsed)) {
      embeddedCanonicalJsonValues.add(canonicalJson);
    }

    if (fileName === "contact.json" && Array.isArray(parsed)) {
      for (const contact of parsed) {
        if (
          typeof contact === "object" &&
          contact !== null &&
          contact.channel === "email"
        ) {
          if (typeof contact.value === "string") {
            approvedContactValues.add(contact.value);
            approvedEmailAddresses.add(contact.value.toLowerCase());
          }

          if (typeof contact.url === "string") {
            approvedContactValues.add(contact.url);
          }
        }
      }
    }
  }

  return {
    approvedContactValues,
    approvedEmailAddresses,
    canonicalJsonValues,
    embeddedCanonicalJsonValues,
  };
}

/**
 * 승인된 공개 contact 문자열만 PII 검사 입력에서 제거한다.
 */
function omitApprovedContactValues(content, approvedContactValues) {
  let filteredContent = content;

  for (const value of approvedContactValues) {
    filteredContent = filteredContent.split(value).join("");
  }

  return filteredContent;
}

/**
 * 파일의 ASCII signature를 NUL 또는 binary byte 유무와 무관하게 검사한다.
 */
async function assertNoSensitiveContent(
  file,
  rootDirectory,
  approvedContactValues,
  approvedEmailAddresses,
) {
  const content = (await readFile(file)).toString("utf8");
  const relativePath = relative(rootDirectory, file);

  for (const pattern of secretPatterns) {
    if (pattern.test(content)) {
      throw new Error(`secret signature가 노출되었습니다: ${relativePath}`);
    }
  }

  const piiScanContent = omitApprovedContactValues(
    content,
    approvedContactValues,
  );

  /**
   * 일반 email은 backend contact의 승인 주소와 exact 비교해 임의 노출을 차단한다.
   */
  const emailScanContents = new Set([content, decodeEscapedText(content)]);

  for (const emailScanContent of emailScanContents) {
    for (const match of emailScanContent.matchAll(emailAddressPattern)) {
      const emailAddress = match[0].toLowerCase();

      if (!approvedEmailAddresses.has(emailAddress)) {
        throw new Error(`미승인 email이 노출되었습니다: ${relativePath}`);
      }
    }
  }

  for (const pattern of piiPatterns) {
    if (pattern.test(piiScanContent)) {
      throw new Error(`미승인 PII가 노출되었습니다: ${relativePath}`);
    }
  }
}

/**
 * 존재하는 디렉터리만 선택적으로 재귀 탐색한다.
 */
async function listOptionalFiles(directory) {
  try {
    return await listFiles(directory);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

/**
 * backend 전체와 배포에 관여하는 production source/config/workflow를 검사한다.
 */
async function verifyProjectSources(
  approvedContactValues,
  approvedEmailAddresses,
) {
  const backendFiles = await listFiles(backendDirectory);
  const sourceFiles = (await listOptionalFiles(join(frontDirectory, "src"))).filter(
    (file) => {
      const relativePath = relative(join(frontDirectory, "src"), file);
      const segments = relativePath.split(sep);

      return (
        !segments.includes("__tests__") &&
        !segments.includes("test") &&
        !/\.(?:test|spec)\.[^.]+$/i.test(file)
      );
    },
  );
  const frontEntries = await readdir(frontDirectory, { withFileTypes: true });
  const configFiles = frontEntries
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name === ".nvmrc" ||
          entry.name === "next-env.d.ts" ||
          entry.name.startsWith("package") ||
          entry.name.includes("config") ||
          entry.name === "tsconfig.json"),
    )
    .map((entry) => join(frontDirectory, entry.name));
  const workflowFiles = await listOptionalFiles(
    join(repositoryDirectory, ".github", "workflows"),
  );

  for (const file of [
    ...backendFiles,
    ...sourceFiles,
    ...configFiles,
    ...workflowFiles,
  ]) {
    await assertNoSensitiveContent(
      file,
      repositoryDirectory,
      approvedContactValues,
      approvedEmailAddresses,
    );
  }
}

/**
 * 모든 텍스트 산출물에서 backend source, credential, PII, 원본 JSON을 검사한다.
 */
async function verifyArtifactContents(
  files,
  canonicalJsonValues,
  embeddedCanonicalJsonValues,
  approvedContactValues,
  approvedEmailAddresses,
) {
  /**
   * 확장자 allowlist 대신 모든 파일을 읽어 SVG와 확장자 없는 텍스트도 검사한다.
   */
  for (const file of files) {
    const buffer = await readFile(file);
    const content = buffer.toString("utf8");
    const relativePath = relative(outDirectory, file);

    if (
      /(?:\.\.\/|\/)backend\/(?:introduce|skill|career|career-work|side-project|contact)\.json/.test(
        content,
      )
    ) {
      throw new Error(`backend 원본 경로가 노출되었습니다: ${relativePath}`);
    }

    /**
     * server-only import 또는 backend filesystem loader source를 발견하면 실패시킨다.
     */
    for (const pattern of serverSourcePatterns) {
      if (pattern.test(content)) {
        throw new Error(`server-only loader source가 노출되었습니다: ${relativePath}`);
      }
    }

    /**
     * 알려진 강한 secret signature를 하나라도 포함하면 export를 실패시킨다.
     */
    await assertNoSensitiveContent(
      file,
      outDirectory,
      approvedContactValues,
      approvedEmailAddresses,
    );
    assertNoRawPortfolioJson(
      content,
      relativePath,
      canonicalJsonValues,
      embeddedCanonicalJsonValues,
    );
  }
}

/**
 * HTML의 href, src, srcset에서 local asset 후보를 추출한다.
 */
function extractHtmlAssetReferences(content, sourceFile) {
  const references = [];

  /**
   * 단일 URL attribute는 원문 URL과 참조 HTML 파일을 함께 보존한다.
   */
  for (const match of content.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    if (match[1] !== undefined) {
      references.push({ sourceFile, url: match[1] });
    }
  }

  /**
   * srcset은 comma로 나눈 각 candidate의 첫 URL token을 검사한다.
   */
  for (const match of content.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
    for (const candidate of (match[1] ?? "").split(",")) {
      const url = candidate.trim().split(/\s+/, 1)[0];

      if (url) {
        references.push({ sourceFile, url });
      }
    }
  }

  return references;
}

/**
 * CSS url()에서 local asset 후보를 추출한다.
 */
function extractCssAssetReferences(content, sourceFile) {
  const references = [];

  /**
   * quote 유무와 관계없이 닫는 괄호 전까지의 URL을 수집한다.
   */
  for (const match of content.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    const url = match[2]?.trim();

    if (url) {
      references.push({ sourceFile, url });
    }
  }

  return references;
}

/**
 * RSC 텍스트의 직렬화된 href, src, srcSet에서 local asset 후보를 추출한다.
 */
function extractSerializedAssetReferences(content, sourceFile) {
  const references = [];

  /**
   * 직렬화된 단일 URL property를 HTML attribute와 같은 계약으로 검사한다.
   */
  for (const match of content.matchAll(/["'](?:href|src)["']\s*:\s*["']([^"']+)["']/gi)) {
    if (match[1] !== undefined) {
      references.push({ sourceFile, url: match[1] });
    }
  }

  /**
   * 직렬화된 srcSet property의 각 candidate URL도 개별 검사한다.
   */
  for (const match of content.matchAll(/["']srcSet["']\s*:\s*["']([^"']+)["']/gi)) {
    for (const candidate of (match[1] ?? "").split(",")) {
      const url = candidate.trim().split(/\s+/, 1)[0];

      if (url) {
        references.push({ sourceFile, url });
      }
    }
  }

  return references;
}

/**
 * JavaScript string literal에 포함된 정적 runtime asset 참조를 추출한다.
 */
function extractJavaScriptAssetReferences(content, sourceFile) {
  const references = [];
  const stringLiteralPattern = /(["'`])((?:\\[\s\S]|(?!\1)[^\\])*)\1/g;

  /**
   * root/relative path이면서 asset 확장자 또는 _next/static 경계를 가진 literal만 검사한다.
   */
  for (const match of content.matchAll(stringLiteralPattern)) {
    const rawValue = match[2];

    if (rawValue === undefined) {
      continue;
    }

    const url = decodeEscapedText(rawValue);
    const isLocalPath =
      url.startsWith("/") ||
      url.startsWith("./") ||
      url.startsWith("../");

    if (isLocalPath && runtimeAssetPathPattern.test(url)) {
      references.push({ sourceFile, url });
    }
  }

  return references;
}

/**
 * network, embedded data, fragment-only URL은 local artifact 검사에서 제외한다.
 */
function isExternalOrEmbeddedUrl(url) {
  return (
    url.startsWith("#") ||
    url.startsWith("//") ||
    /^(?:https?:|data:|blob:|mailto:|tel:|javascript:)/i.test(url)
  );
}

/**
 * query와 fragment를 제거하고 percent-encoded local path를 복원한다.
 */
function normalizeLocalUrlPath(url) {
  const pathOnly = url.split(/[?#]/, 1)[0] ?? "";

  try {
    return decodeURIComponent(pathOnly);
  } catch {
    throw new Error(`decode할 수 없는 local asset URL입니다: ${url}`);
  }
}

/**
 * local URL이 base path를 지키고 out 내부의 실제 파일을 가리키는지 검사한다.
 */
async function verifyLocalAssetReference(reference, expectedBasePath) {
  if (isExternalOrEmbeddedUrl(reference.url)) {
    return;
  }

  const localPath = normalizeLocalUrlPath(reference.url);
  let targetPath;

  /**
   * root-relative URL은 project base path를 제거한 뒤 out 루트에서 해석한다.
   */
  if (localPath.startsWith("/")) {
    const hasExpectedBasePath =
      expectedBasePath === "" ||
      localPath === expectedBasePath ||
      localPath.startsWith(`${expectedBasePath}/`);

    if (!hasExpectedBasePath) {
      throw new Error(`base path가 누락된 local asset URL입니다: ${reference.url}`);
    }

    const withoutBasePath =
      expectedBasePath === ""
        ? localPath
        : localPath.slice(expectedBasePath.length);
    targetPath = resolve(outDirectory, withoutBasePath.replace(/^\/+/, ""));
  } else {
    targetPath = resolve(dirname(reference.sourceFile), localPath);
  }

  if (
    targetPath !== outDirectory &&
    !targetPath.startsWith(`${outDirectory}${sep}`)
  ) {
    throw new Error(`out 경계를 벗어난 local asset URL입니다: ${reference.url}`);
  }

  /**
   * directory URL은 trailing-slash export의 index.html을 실제 대상으로 사용한다.
   */
  let targetStats;

  try {
    targetStats = await stat(targetPath);
  } catch {
    throw new Error(`존재하지 않는 local asset URL입니다: ${reference.url}`);
  }

  if (targetStats.isDirectory()) {
    targetPath = join(targetPath, "index.html");
  }

  try {
    const finalStats = await stat(targetPath);

    if (!finalStats.isFile()) {
      throw new Error(`파일이 아닌 local asset URL입니다: ${reference.url}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("파일이 아닌")) {
      throw error;
    }

    throw new Error(`존재하지 않는 local asset URL입니다: ${reference.url}`);
  }
}

/**
 * HTML, CSS, RSC, JavaScript가 참조하는 local asset의 base path와 실재 여부를 검사한다.
 */
async function verifyAssetReferences(files) {
  const references = [];
  const expectedBasePath = normalizeBasePath(
    process.env.NEXT_PUBLIC_BASE_PATH,
  );

  /**
   * HTML, CSS, RSC, JavaScript literal asset URL을 source file 기준으로 각각 수집한다.
   */
  for (const file of files) {
    const extension = extname(file).toLowerCase();

    if (
      extension !== ".html" &&
      extension !== ".css" &&
      extension !== ".txt" &&
      extension !== ".js" &&
      extension !== ".mjs" &&
      extension !== ".cjs"
    ) {
      continue;
    }

    const content = await readFile(file, "utf8");
    references.push(
      ...(extension === ".html"
        ? extractHtmlAssetReferences(content, file)
        : extension === ".css"
          ? extractCssAssetReferences(content, file)
          : extension === ".txt"
            ? extractSerializedAssetReferences(content, file)
            : extractJavaScriptAssetReferences(content, file)),
    );
  }

  if (references.length === 0) {
    throw new Error("정적 export에서 local asset reference를 찾지 못했습니다.");
  }

  /**
   * 각 참조를 순차 검증해 실패한 URL을 결정적인 순서로 보고한다.
   */
  for (const reference of references) {
    await verifyLocalAssetReference(reference, expectedBasePath);
  }
}

/**
 * GitHub Pages에 업로드할 out 디렉터리의 공개 경계를 검증한다.
 */
async function verifyExport() {
  await access(indexPath);
  const backendContract = await loadBackendContract();
  const files = await listFiles(outDirectory, true);

  if (files.length === 0) {
    throw new Error("정적 export 산출물이 비어 있습니다.");
  }

  await verifyProjectSources(
    backendContract.approvedContactValues,
    backendContract.approvedEmailAddresses,
  );
  verifyArtifactPaths(files);
  await verifyArtifactContents(
    files,
    backendContract.canonicalJsonValues,
    backendContract.embeddedCanonicalJsonValues,
    backendContract.approvedContactValues,
    backendContract.approvedEmailAddresses,
  );
  await verifyAssetReferences(files);
}

/**
 * 검증 실패를 명확한 비정상 종료 코드로 CI에 전달한다.
 */
try {
  await verifyExport();
  process.stdout.write("Static export verification passed.\n");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Static export verification failed: ${message}\n`);
  process.exitCode = 1;
}
