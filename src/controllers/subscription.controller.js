import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    
    if (!channelId || !isValidObjectId(channelId)) {
        throw new ApiError(400, "provide channel id")
    }

    const channel = await User.findById(channelId)

    if (!channel) {
        throw new ApiError(404, "provided id does not exists")
    }

    const isExist = await Subscription.findOne({subscriber: req.user._id, channel: channelId})

    if (!isExist) {
        // add subscriber if it is not exist
        try {
            await Subscription.create(
                {
                    subscriber: req.user._id,
                    channel: channelId
                }
            )

            return res
            .status(200)
            .json(new ApiResponse(200, "Subscribed", "Subscription added"))
        } catch (error) {
            throw new ApiError(500, "something went wrong when adding your subscription")
        }
    }
    else {
        // remove subscriber if it is exist
        try {
            await Subscription.findByIdAndDelete(isExist._id)

            return res
            .status(200)
            .json(new ApiResponse(200, "Subscribe", "Subscription removed"))
        } catch (error) {
            throw new ApiError(500, "something went wrong when removing your subscription")
        }
    }

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if (!channelId || !isValidObjectId(channelId)) {
        throw new ApiError(400, "provide channel id")
    }

    const channel = await User.findById(channelId)

    if (!channel) {
        throw new ApiError(404, "provided id does not exists")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match:{channel:channelId}
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscriber"
            }
        },
        {
            $unwind:"$subscriber"
        },
        {
            $project:{
                subscriber:{
                    _id:1,
                    userName:1,
                    fullName:1,
                    avatar:1
                }
            }
        }
    ])

    if (!subscribers.length) {
        throw new ApiError(404, "this channel have no subscribers yet")
    }

    const info = {
        subscribers: subscribers || [],
        totalSubscribers : subscribers.length || 0
    }

    return res
    .status(200)
    .json(new ApiResponse(200, info, "subscribers fetched successfully"))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!subscriberId) {
        throw new ApiError(400, "please provide id")
    }

    const user = await User.findById(subscriberId)

    if (!user) {
        throw new ApiError(404, "subscriber not found")
    }

    const subscribedChannel = await Subscription.aggregate([
        {
            $match: {subscriber: subscriberId}
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel"
            }
        },
        {
            $unwind: "$channel"
        },
        {
            $project:{
                subscriber:{
                    _id:1,
                    userName:1,
                    fullName:1,
                    avatar:1
                }
            }
        }
    ])

    if (!subscribedChannel.length) {
        throw new ApiError(408, "the user have not subscribed to any channel")
    }

    return res
    .status(200)
    .json(200, subscribedChannel, "subscribed channel fetched successfully")
    
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}