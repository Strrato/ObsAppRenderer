const Tables = {
    users : {
        name : 'users',
        fields : {
            id           : 'user_id',
            username     : 'user_username',
            password     : 'user_password',
            salt         : 'user_salt',
            scopes       : 'user_scopes',
            token        : 'user_token',
            registerToken: 'user_register_token',
        }
    },
    profiles : {
        name : 'profiles',
        fields : {
            id      : 'profile_id',
            user    : 'profile_user_id',
            twitch  : 'profile_twitch',
            restream: 'profile_restream'
        }
    }
};

export default Tables;