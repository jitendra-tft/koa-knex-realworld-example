const _ = require('lodash')
const uuid = require('uuid')

module.exports = {

  async byUsername (username, ctx, next) {
    if (!username) {
      ctx.throw(404)
    }

    ctx.params.profile = await ctx.app.db('users')
      .first('username', 'bio', 'image', 'id')
      .where({username})

    if (!ctx.params.profile) {
      ctx.throw(404)
    }

    ctx.params.profile.following = false
    return next()
  },

  async get (ctx) {
    const {profile} = ctx.params
    const {user} = ctx.state

    if (user && user.username !== profile.username) {
      const res = await ctx.app.db('followers')
        .select()
        .where({user: profile.id, follower: user.id})

      if (res.length > 0) {
        profile.following = true
      }
    }

    ctx.body = {profile: _.omit(profile, 'id')}
  },

  follow: {

    async post (ctx) {
      const {profile} = ctx.params
      const {user} = ctx.state

      if (user.username !== profile.username) {
        const follow = {
          id: uuid(),
          user: profile.id,
          follower: user.id
        }

        try {
          await ctx.app.db('followers').insert(follow)
        } catch (err) {
          if (
            !err.message.includes('UNIQUE constraint failed') &&
            !err.message.includes(
              'unique constraint "followers_user_follower_unique'
            )
          ) {
            throw err
          }
        }

        profile.following = true
      }

      ctx.body = {profile: _.omit(profile, 'id')}
    },

    async del (ctx) {
      const {profile} = ctx.params
      const {user} = ctx.state

      await ctx.app.db('followers')
        .where({user: profile.id, follower: user.id})
        .del()

      ctx.body = {profile: _.omit(profile, 'id')}
    }

  }

}
