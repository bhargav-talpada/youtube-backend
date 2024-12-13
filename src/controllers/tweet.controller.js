import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "content is required")
    }

    const tweet = await Tweet.create({
        content,
        onwer: req.user._id
    })

    if (!tweet) {
        throw new ApiError(500, "something went wrong when creating tweet")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, tweet, "tweet created"))

})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "invalid id")
    }    

    const userTweets = await Tweet.aggregate([
        {
            $match:{owner:userId}
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"ownerOfTweet"
            }
        },
        {
            $unwind:"$ownerOfTweet"
        },
        {
            $project:{
                owner:"$ownerOfTweet",
                content:1
            }
        }
    ])

    if(!userTweets.length){
        throw new ApiError(408,"user have no tweets yet")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,userTweets,"tweets fetched successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body

    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "invalid id")
    }   
    
    if (!content) {
        throw new ApiError(400, "content is required")
    }   

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "tweet not found")
    }   

    // if (!tweet.owner.equals(req.user?._id)) {
    //     throw new ApiError(400, "You cannot update this comment");
    // }
    

    const updateTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content
            }
        },
        { new: true }
    )

    if (!updateTweet) {
        throw new ApiError(500, "something went wrong while updating tweet")
    }   

    return res
    .status(200)
    .json(new ApiResponse(200, updateTweet, "tweet successfully updated"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "invalid id")
    }   

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "tweet not found")
    }   

    // if (!((tweet.owner).equals(req.user?._id))) {
    //     throw new ApiError(400, "You can not deleting this comment");  
    // }

    const deleteTweet = await Tweet.findByIdAndDelete(tweetId)

    if (!deleteTweet) {
        throw new ApiError(500, "something went wrong while deleting tweet")
    }   

    return res
    .status(200)
    .json(new ApiResponse(200, deleteTweet, "tweet successfully deleted"))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}