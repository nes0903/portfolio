insert into public.portfolio_documents (
  slug,
  content,
  published,
  owner_id
)
values (
  'main',
  $portfolio$
  {
    "introduce": {
      "title": "검증 가능한 제품을 만드는 개발자",
      "content": "공개 가능한 가상 포트폴리오 시드입니다.\n구조화된 데이터와 자동 검증을 바탕으로 신뢰할 수 있는 사용자 경험을 설계합니다."
    },
    "skills": [
      {
        "id": "typescript",
        "name": "TypeScript",
        "category": "Language",
        "order": 1
      }
    ],
    "careers": [
      {
        "id": "sample-studio",
        "company": "가상 제품 스튜디오",
        "role": "소프트웨어 엔지니어",
        "startDate": "2024-01",
        "endDate": "2025-12",
        "summary": "정적 콘텐츠 품질과 배포 검증을 담당한 가상 경력 예시입니다.",
        "order": 1
      }
    ],
    "careerWorks": [
      {
        "id": "static-portfolio-validation",
        "careerId": "sample-studio",
        "title": "정적 포트폴리오 검증",
        "description": "구조화된 콘텐츠를 빌드 전에 검증하고 정적 산출물의 공개 경계를 확인했습니다.",
        "achievements": [
          "콘텐츠 계약 위반을 배포 전에 감지하는 예시 흐름을 구성했습니다."
        ],
        "technologies": [
          "TypeScript"
        ],
        "order": 1
      }
    ],
    "sideProjects": [
      {
        "id": "verified-static-portfolio",
        "name": "Verified Static Portfolio",
        "description": "공개 가능한 가상 JSON을 검증해 정적 페이지로 제공하는 예시 프로젝트입니다.",
        "role": "Creator",
        "skills": [
          "TypeScript"
        ],
        "links": {
          "repository": "https://github.com/example-portfolio-profile/verified-static-portfolio"
        },
        "order": 1
      }
    ],
    "contacts": [
      {
        "id": "github",
        "channel": "github",
        "label": "GitHub",
        "value": "example-portfolio-profile",
        "url": "https://github.com/example-portfolio-profile",
        "order": 1
      }
    ]
  }
  $portfolio$::jsonb,
  true,
  null
)
on conflict (slug) do update
set
  content = excluded.content,
  published = excluded.published,
  updated_at = now();
