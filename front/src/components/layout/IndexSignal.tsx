/**
 * 다섯 개 콘텐츠 section을 나타내는 장식용 인덱스 신호.
 */
export function IndexSignal() {
  return (
    <svg
      className="mark"
      viewBox="0 0 26 78"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M13 5v68" fill="none" stroke="currentColor" strokeWidth="2" />
      {[7, 23, 39, 55, 71].map((centerY) => (
        <circle key={centerY} cx="13" cy={centerY} r="4" fill="currentColor" />
      ))}
    </svg>
  );
}
