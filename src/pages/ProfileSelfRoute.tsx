import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import ProfileView from '@/components/ProfileView';

const ProfileSelfRoute: React.FC = () => {
  const { user } = useAppContext();
  if (!user?.id) return <Navigate to="/" replace />;
  return <ProfileView userId={user.id} />;
};

export default ProfileSelfRoute;


