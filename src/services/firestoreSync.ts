import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { VulnerabilityReport, TargetProgram } from '../types';

/**
 * Fetch all reports for the current user from Firestore
 */
export async function fetchCloudReports(): Promise<VulnerabilityReport[]> {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const q = query(
      collection(db, 'reports'),
      where('ownerId', '==', user.uid)
    );
    const snap = await getDocs(q);
    const reports: VulnerabilityReport[] = [];
    snap.forEach((d) => {
      reports.push(d.data() as VulnerabilityReport);
    });
    return reports;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'reports');
  }
}

/**
 * Save or update a vulnerability report in Firestore
 */
export async function saveCloudReport(report: VulnerabilityReport): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const reportRef = doc(db, 'reports', report.id);
    const payload = {
      ...report,
      ownerId: user.uid,
      reporterEmail: user.email || 'anonymous',
      syncedAt: new Date().toISOString()
    };
    await setDoc(reportRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `reports/${report.id}`);
  }
}

/**
 * Delete a report from Firestore
 */
export async function deleteCloudReport(reportId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const reportRef = doc(db, 'reports', reportId);
    await deleteDoc(reportRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `reports/${reportId}`);
  }
}

/**
 * Fetch targets from Firestore
 */
export async function fetchCloudTargets(): Promise<TargetProgram[]> {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const snap = await getDocs(collection(db, 'targets'));
    const targets: TargetProgram[] = [];
    snap.forEach((d) => {
      targets.push(d.data() as TargetProgram);
    });
    return targets;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'targets');
  }
}

/**
 * Save a target program in Firestore
 */
export async function saveCloudTarget(target: TargetProgram): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const targetRef = doc(db, 'targets', target.id);
    const payload = {
      ...target,
      ownerId: user.uid,
      syncedAt: new Date().toISOString()
    };
    await setDoc(targetRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `targets/${target.id}`);
  }
}

/**
 * Delete a target program from Firestore
 */
export async function deleteCloudTarget(targetId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const targetRef = doc(db, 'targets', targetId);
    await deleteDoc(targetRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `targets/${targetId}`);
  }
}

/**
 * Sync local reports to Cloud Firestore
 */
export async function syncLocalReportsToCloud(localReports: VulnerabilityReport[]): Promise<{ synced: number }> {
  const user = auth.currentUser;
  if (!user || localReports.length === 0) return { synced: 0 };

  let count = 0;
  for (const report of localReports) {
    try {
      await saveCloudReport(report);
      count++;
    } catch (e) {
      console.warn('Failed to sync report to Firestore:', report.id, e);
    }
  }
  return { synced: count };
}
