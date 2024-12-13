import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose';

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh nd access token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    
    // ------- get user details from frontend -------
    const { username, email, fullName, password } = req.body;
    
    // ------- validation - not empty -------
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All Fields are required!!! ")
    }
    
    // ------- check if user already exists : username, email -------
    const existedUser = await User.findOne({
        $or: [{ username },{ email }]
    })
    if (existedUser) {
        throw new ApiError(400, `User with ${username} or ${email} already exists`)
    }
    
    // ------- check for images, avatar -------
    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required!!")
    }
    
    // ------- upload them to cloudinary, avatar -------
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required!!")
    }

    // ------- create user object - create entry in db -------
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // ------- remove password and refresh token field from response -------
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    // ------- check for user creation -------
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // ------- return res -------
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered")
    )

} )

const loginUSer = asyncHandler( async (req, res) => {
    // ------- get data from req body -------
    const {username, email, password} = req.body

    // ------- username or email -------
    if (! (username || email)) {
        throw new ApiError(400, "username or email is required")
    }

    // ------- find the user -------
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "user does not exists")
    }

    // ------- check password -------
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, 'password incorrect')
    }

    // ------- generate access and refresh token -------
    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

    // ------- send cookie -------
    const loggedInUSer = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    // ------- response -------
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)   // set accessToken on cookie
    .cookie("refreshToken", refreshToken, options)   // set refreshToken on cookie
    .json(new ApiResponse(
        200, 
        {
            user: loggedInUSer, accessToken, refreshToken
        }
        , "User loggedIn Successfully..."))

} )

const logoutUser = asyncHandler ( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }
     
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json( new ApiResponse (200, {}, "User Logged Out"))

} )

const refreshAccessToken = asyncHandler ( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken  

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is Expired or Used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const { accessToken, newRefreshToken } = await generateAccessTokenAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken}, 
                "Accesstoken refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

} )

const changeCurrentPassword = asyncHandler ( async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword )

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Password")
    }

    user.password = newPassword

    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
} )

const getCurrentUser = asyncHandler ( async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"))
} )

const updateAccountDetails = asyncHandler ( async (req, res) => {
    const {fullName, email, username} = req.body

    if (!(email || fullName || username)) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email,
                username
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details update successfully"))
} )

const updateUserAvatar = asyncHandler ( async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json( new ApiResponse(200, user, "Avatar update successfully"))

} )

const updateCoverImage = asyncHandler ( async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "coverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json( new ApiResponse(200, user, "CoverImage update successfully"))

} )

const getUserChannelProfile = asyncHandler ( async (req, res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    // aggregation pipeline
    const channel = await User.aggregate([
        {
            // match user's username
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            // get channel subscribers
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            // get how many channel i subscribed
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            // count total channel subscribers and i subscribed channel and add them
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            // projection or display fields
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])
    console.log("channel", channel)

    if (!channel?.length) {
        throw new ApiError(200, "channel does not exists")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User Channel fetched successfully"))
} )

const getWatchHistory = asyncHandler ( async (req, res) => {
    const user = await User.aggregate([
        {
            // find user based on ObjectId
            // req.user._id -> it gives id in form of string
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            // get all videos id which i saw and save in history
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        // get user who saw vidoes
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    // which user field i display (projection)
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        // get first fiels from owner's array
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "Watch History fetched successfully"))
} )

export { 
    registerUser,
    loginUSer, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails, 
    updateUserAvatar ,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
}