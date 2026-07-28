export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  OPEN: { bg: '#FEF9C3', text: '#CA8A04', border: '#FDE68A' },
  IN_PROGRESS: { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD' },
  COMPLETED: { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' },
  CANCELLED: { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' },
};

export const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierta',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

export const getCategoryName = (req: {
  categoryId?: { name: string } | null;
  customCategory?: string | null;
}): string => {
  if (req.categoryId && typeof req.categoryId === 'object') return req.categoryId.name;
  if (req.customCategory) return req.customCategory;
  return 'Sin categoría';
};

export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const units: { singular: string; plural: string; divisor: number }[] = [
    { singular: 'año', plural: 'años', divisor: 31536000 },
    { singular: 'mes', plural: 'meses', divisor: 2592000 },
    { singular: 'semana', plural: 'semanas', divisor: 604800 },
    { singular: 'día', plural: 'días', divisor: 86400 },
    { singular: 'hora', plural: 'horas', divisor: 3600 },
    { singular: 'minuto', plural: 'minutos', divisor: 60 },
  ];

  for (const unit of units) {
    const count = Math.floor(diffInSeconds / unit.divisor);
    if (count >= 1) {
      return `hace ${count} ${count === 1 ? unit.singular : unit.plural}`;
    }
  }
  return 'hace un momento';
};
