const pool = require('../config/db');

class Follow {
    static async follow(followerId, followingId) {
        if (followerId === followingId) throw new Error('Vous ne pouvez pas vous suivre vous-même');
        const existing = await pool.query('SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2', [followerId, followingId]);
        if (existing.rows.length > 0) return null;
        await pool.query('INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)', [followerId, followingId]);
        const count = await pool.query('SELECT COUNT(*) as count FROM followers WHERE following_id = $1', [followingId]);
        return { following: true, followersCount: parseInt(count.rows[0].count) };
    }

    static async unfollow(followerId, followingId) {
        const result = await pool.query('DELETE FROM followers WHERE follower_id = $1 AND following_id = $2 RETURNING *', [followerId, followingId]);
        if (result.rows.length === 0) return null;
        const count = await pool.query('SELECT COUNT(*) as count FROM followers WHERE following_id = $1', [followingId]);
        return { following: false, followersCount: parseInt(count.rows[0].count) };
    }

    static async isFollowing(followerId, followingId) {
        const result = await pool.query('SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2', [followerId, followingId]);
        return result.rows.length > 0;
    }

    static async getFollowersCount(userId) {
        const result = await pool.query('SELECT COUNT(*) as count FROM followers WHERE following_id = $1', [userId]);
        return parseInt(result.rows[0].count);
    }

    static async getFollowingCount(userId) {
        const result = await pool.query('SELECT COUNT(*) as count FROM followers WHERE follower_id = $1', [userId]);
        return parseInt(result.rows[0].count);
    }

    static async getFollowers(userId, limit = 50, offset = 0) {
        const result = await pool.query(
            `SELECT u.id, u.username, u.avatar, f.created_at FROM followers f JOIN users u ON f.follower_id = u.id WHERE f.following_id = $1 ORDER BY f.created_at DESC LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        return result.rows;
    }

    static async getFollowing(userId, limit = 50, offset = 0) {
        const result = await pool.query(
            `SELECT u.id, u.username, u.avatar, f.created_at FROM followers f JOIN users u ON f.following_id = u.id WHERE f.follower_id = $1 ORDER BY f.created_at DESC LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        return result.rows;
    }
}

module.exports = Follow;