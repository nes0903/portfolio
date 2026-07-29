interface EmptyStateProps {
  readonly children: string;
}

/**
 * 비어 있는 승인 콘텐츠를 성공 콘텐츠와 구분해 알린다.
 */
export function EmptyState({ children }: EmptyStateProps) {
  return (
    <p className="empty-state" role="status">
      {children}
    </p>
  );
}
