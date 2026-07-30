import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { WorkerMeetingDetail } from '../../components/Meetings/Worker/WorkerMeetingDetail';

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WorkerMeetingDetail meetingId={id} />
    </>
  );
}
