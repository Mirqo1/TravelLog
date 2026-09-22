import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import { photoAccess } from '../utils/visitPhotos';
import { useAuth } from '../context/AuthContext';
import { getCloudAccount } from '../services/cloudBackupService';

export function usePhotoAccess() {
  const { account } = useAuth();
  const packageName = Constants.expoConfig?.android?.package;
  const { preview } = photoAccess(packageName);
  const [access, setAccess] = useState(null);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const user = getCloudAccount();
      if (!user || user.uid !== account?.uid) { if (active) setAccess(null); return; }
      try {
        const { claims } = await user.getIdTokenResult();
        if (active) setAccess({ uid: user.uid, allowed: photoAccess(packageName, claims).canAddPhotos });
      } catch { if (active) setAccess(null); }
    };
    if (!preview) refresh();
    const listener = AppState.addEventListener('change', state => { if (!preview && state === 'active') refresh(); });
    return () => { active = false; listener.remove(); };
  }, [account?.uid, preview, packageName]);
  return { canAddPhotos: preview || (access?.uid === account?.uid && access?.allowed === true), preview };
}
