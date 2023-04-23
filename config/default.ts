export default {
    port: process.env.PORT || 1337,
    dbUri: "",
    saltWorkFactor: 10,
    accessTokenTtl: "15m",
    refreshTokenTtl: "1y",
    reportsToQuarantine: 2,
    maximumEventCreationsPerDay: 50,
    maximumCommentCreationsPerDay: 1000,
    oneTimeCodeTtl: 3600000,
    publicKey: ``, // public key for server client communication
    privateKey: ``, // private key for server client communication
    googleClientId: '',
    googleOauthRedirectUrl: '',
    googleClientSecret: '',
    serverUrl: '',
    email: "", // email address to send oneTimeCodes
    emailPassword: "",
    //serverUrl: 'http://localhost:1337', for local environment
};
  