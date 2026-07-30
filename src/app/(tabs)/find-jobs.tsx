import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WorkerFindJobs } from '../../components/dashboard/Worker/WorkerFindJobs';
import { WD } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';

export default function FindJobsScreen() {
  const { user } = useAuthStore();
  const workerId = String(user?.id || user?._id || '');

  return (
    <View style={styles.container}>
      <WorkerFindJobs workerId={workerId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WD.lightGray },
});
