export function hasFeatureCredit(profile, feature) {
  return (
    profile[`${feature}_uses_remaining`] > 0 ||
    profile.feature_packs?.some(pack => pack.type === feature && pack.uses_remaining > 0)
  );
} 