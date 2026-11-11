import { resendVerification } from '../api/auth';
import { useSendCooldown } from './useSendCooldown';

export { formatWait } from './useSendCooldown';
export type { SendStatus as ResendStatus } from './useSendCooldown';

export function useResendVerification(sent?: { email: string; at: number }) {
  return useSendCooldown(resendVerification, sent);
}
