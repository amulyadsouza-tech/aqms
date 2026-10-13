/**
 * Formatting and display helper functions for telemetry and timestamps.
 */

export function formatTimestamp(timestamp: number | null | undefined): string {
  if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
    return 'No timestamp available';
  }
  const date = new Date(timestamp);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatTimeOnly(timestamp: number | null | undefined): string {
  if (!timestamp || isNaN(timestamp) || timestamp <= 0) return '--:--:--';
  return new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatRelativeTime(timestamp: number | null | undefined): string {
  if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
    return 'Never';
  }
  const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);

  if (diffSeconds < 0) return 'Just now';
  if (diffSeconds < 15) return 'Just now (<15s ago)';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

export function formatSensorValue(
  value: number | null | undefined,
  precision: number = 1,
  fallback: string = '--'
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return value.toFixed(precision);
}

export function formatGpsCoordinate(coord: number | null | undefined, isLat: boolean): string {
  if (coord === null || coord === undefined || isNaN(coord)) return '--';
  const dir = isLat ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
  return `${Math.abs(coord).toFixed(5)}° ${dir}`;
}

export function getGoogleMapsUrl(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  if (lat === 0 && lng === 0) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
