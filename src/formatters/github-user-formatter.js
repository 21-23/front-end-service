module.exports = profile => ({
    providerId: profile.id,
    displayName: profile.displayName,
    nickName: profile.username,
    provider: 'github',
});
