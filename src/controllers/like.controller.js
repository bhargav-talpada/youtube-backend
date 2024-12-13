import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid id")
    }
    
    const isLiked = await Like.findOne({video: videoId, likedBy:req.user._id})

    if (!isLiked) {
        try {
            await Like.create({
                video: videoId,
                likedBy: req.user._id
            })

            return res
            .status(200)
            .json(new ApiResponse(200, "liked", "like added"))
        } catch (error) {
            throw new ApiError(500, "something went wrong while adding your like")
        }
    }
    else{
        try {
            await Like.findByIdAndDelete({video: videoId, likedBy:req.user._id})

            return res
            .status(200)
            .json(new ApiResponse(200, "unliked", "like removed"))
        } catch (error) {
            throw new ApiError(500, "something went wrong while removing your like")
        }
    }

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    
    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "invalid id")
    }

    const iscommentExist = await Comment.findById(commentId)

    if (!iscommentExist) {
        throw new ApiError(404, "comment not found")
    }

    const likedComment = await Like.findOne({comment:commentId, likedBy:req.user._id})

    if (!likedComment) {
        try {
            await Like.create({
                comment: commentId,
                likedBy: req.user._id
            })

            return res
            .status(200)
            .json(new ApiResponse(200, "liked", "like added"))
        } catch (error) {
            throw new ApiError(500, "something went wrong while adding like on comment")
        }
    }
    else{
        try {
            await Like.findByIdAndDelete(likedComment._id)

            return res
            .status(200)
            .json(new ApiResponse(200, "unliked", "like removed"))
        } catch (error) {
            throw new ApiError(500, "something went wrong while adding like on comment")
        }
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    
    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "invalid id")
    }

    const isTweetExist = await Tweet.findById(tweetId)

    if (!isTweetExist) {
        throw new ApiError(404, "tweet not found")
    }

    const isLikedTweet = await Like.findOne({tweet: tweetId, likedBy: req.user._id})

    if (!isLikedTweet) {
        try {
            await Like.create({
                likedBy: req.user._id,
                tweet: tweetId
            })

            return res
            .status(200)
            .json(new ApiResponse(200, "liked", "like added"))
        } catch (error) {
            throw new ApiError(500, "something went wrong while adding like on tweet")
        }
    }
    else {
        try {
            await Like.findByIdAndDelete(isLikedTweet._id)
            
            return res
            .status(200)
            .json(new ApiResponse(200, "unliked", "like removed"))
        } catch (error) {
            throw new ApiError(500, "something went wrong while removing like on tweet")
        }
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            $match:{likedBy:new mongoose.Types.ObjectId(req.user._id)}
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"video"
            }
        },
        {
            $unwind:"$video"
        },
        {
            $lookup:{
                from:"users",
                localField:"video.owner",
                foreignField:"_id",
                as:"owner"
            }
        },
        {
            $unwind:"$owner"
        },
        {
            $project:{
                titel:"$video.title",
                thumbnail:"$video.thumbnail",
                videoFile:"$video.videoFile",
                description:"$video.description",
                duration:"$video.duration",
                views:"$video.views",
                owner:{
                    fullName:"$owner.fullName",
                    userName:"$owner.userName",
                    avatar:"$owner.avatar"
                }
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200,likedVideos,"liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}