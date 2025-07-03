declare module '@videosdk.live/react-native-sdk' {
  export function register(): void;
  export const MeetingProvider: any;
  export function useMeeting(opts?: any): any;
  export function useParticipant(participantId: string): any;
  export const MediaStream: any;
  export const RTCView: any;
}