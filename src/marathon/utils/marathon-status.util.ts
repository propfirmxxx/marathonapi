import { MarathonStatus } from '../enums/marathon-status.enum';

export function calculateMarathonLifecycleStatus(
  startDate?: Date,
  endDate?: Date,
  now: Date = new Date(),
): MarathonStatus {
  if (startDate && startDate > now) {
    return MarathonStatus.UPCOMING;
  }

  if (startDate && startDate <= now && (!endDate || endDate >= now)) {
    return MarathonStatus.ONGOING;
  }

  if (endDate && endDate < now) {
    return MarathonStatus.FINISHED;
  }

  return MarathonStatus.UPCOMING;
}

