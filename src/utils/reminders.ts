type AnyRecord = Record<string, any>;

export type ReminderItem = {
  id: string;
  kind: 'meeting' | 'workLog' | 'verifyDay';
  title: string;
  subtitle: string;
  badge: string;
  overdue: boolean;
  sortDate: number;
  route: string;
};

const getIdString = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
};

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatMeetingDate = (date: Date): string => {
  const now = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const time = date.toLocaleTimeString('es-GT', { hour: 'numeric', minute: '2-digit' });

  if (isSameDay(date, now)) return `Hoy, ${time}`;
  if (isSameDay(date, tomorrow)) return `Mañana, ${time}`;

  const dayMonth = date.toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${dayMonth}, ${time}`;
};

// ================= REUNIONES (cliente y worker) =================
// Solo reuniones ya CONFIRMED (con link de Meet listo). Las PENDING de confirmar
// ya se manejan aparte con getPendingMeetings en las pantallas de ofertas/solicitudes.
  export function getMeetingReminders(
    meetings: AnyRecord[],
    userId: string,
    services: AnyRecord[] = []
  ): ReminderItem[] {
    const now = Date.now();
    const cutoff = now - 2 * 60 * 60 * 1000; // conserva reuniones que empezaron hace <2h

    return meetings
      .filter((m) => m.status === 'CONFIRMED' && m.startTime)
      .filter((m) => new Date(m.startTime).getTime() >= cutoff)
      .map((m) => {
        const isClient = getIdString(m.clientId) === userId;
        const other = isClient ? m.workerId : m.clientId;
        const otherName = other ? `${other.firstName || ''} ${other.lastName || ''}`.trim() : 'la otra persona';
        const date = new Date(m.startTime);
        const requestId = getIdString(m.serviceRequestId);
        const proposalId = getIdString(m.proposalId);

        let route = isClient ? `/my-requests/${requestId}` : `/my-offers/${proposalId}`;
        if (!isClient) {
          const relatedService = services.find((s) => getIdString(s.proposalId) === proposalId);
          if (relatedService) {
            route = `/worker-service/${relatedService._id}`;
          }
        }

        return {
          id: `meeting-${m._id}`,
          kind: 'meeting' as const,
          title: `Entrevista con ${otherName}`,
          subtitle: m.serviceRequestId?.title || 'Servicio',
          badge: formatMeetingDate(date),
          overdue: date.getTime() < now,
          sortDate: date.getTime(),
          route,
        };
      })
      .sort((a, b) => a.sortDate - b.sortDate);
  }

  // ================= REGISTRO DIARIO PENDIENTE (worker) =================
  // Días del workPlan cuya fecha ya llegó y siguen en PENDING (no se marcaron como
  // completados). "No ha llenado" y "no lo ha marcado como completado" son el mismo
  // estado en este modelo, así que un solo chequeo cubre ambos casos.
  export function getWorkerLogReminders(services: AnyRecord[]): ReminderItem[] {
    const today = startOfDay(new Date());
    const items: ReminderItem[] = [];

    services
      .filter((s) => s.status === 'IN_PROGRESS')
      .forEach((service) => {
        (service.workPlan || []).forEach((day: AnyRecord) => {
          if (day.status !== 'PENDING') return;

          const dayOnly = startOfDay(new Date(day.date));
          if (dayOnly.getTime() > today.getTime()) return; // aún no llega la fecha

          const isToday = dayOnly.getTime() === today.getTime();
          const diffDays = Math.round((today.getTime() - dayOnly.getTime()) / 86400000);

          items.push({
            id: `worklog-${service._id}-${day.dayNumber}`,
            kind: 'workLog',
            title: `Día ${day.dayNumber}: ${day.description}`,
            subtitle: service.requestId?.title || service.serviceCode || 'Servicio',
            badge: isToday ? 'Vence hoy' : `Atrasado ${diffDays} día${diffDays === 1 ? '' : 's'}`,
            overdue: !isToday,
            sortDate: dayOnly.getTime(),
            route: `/worker-service/${service._id}`,
          });
        });
      });

    return items.sort((a, b) => a.sortDate - b.sortDate);
  }

  // ================= VERIFICACIÓN PENDIENTE (client) =================
  // Días que el worker ya marcó como DONE pero el cliente todavía no verifica.
  export function getClientVerifyReminders(services: AnyRecord[]): ReminderItem[] {
    const items: ReminderItem[] = [];

    services
      .filter((s) => s.status === 'IN_PROGRESS' || s.status === 'COMPLETED')
      .forEach((service) => {
        (service.workPlan || []).forEach((day: AnyRecord) => {
          if (day.status !== 'DONE') return;

          const dayDate = new Date(day.date);
          items.push({
            id: `verify-${service._id}-${day.dayNumber}`,
            kind: 'verifyDay',
            title: `Día ${day.dayNumber}: ${day.description}`,
            subtitle: service.workerId?.firstName
              ? `Marcado por ${service.workerId.firstName}`
              : service.requestId?.title || service.serviceCode || 'Servicio',
            badge: 'Por verificar',
            overdue: false,
            sortDate: dayDate.getTime(),
            route: `/my-services/${service._id}`,
          });
        });
      });

    return items.sort((a, b) => a.sortDate - b.sortDate);
  }