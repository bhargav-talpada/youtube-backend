import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteInCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler ( async (req, res) => {
    //TODO: get all videos based on query, sort, pagination
    const { page = 1, limit = 10, query = "", sortBy, sortType } = req.query
    const  userId = req.user?._id

    const searchQuery = typeof query === "string" ? query : "";

    const videos = await Video.aggregate([
        {
            $match:{
                owner: userId,
                $or:[
                    {title:{$regex:searchQuery,$options:"i"}},
                    {description:{$regex:searchQuery,$options:"i"}}
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "createdBy"
            }
        },
        {
            $unwind: "$createdBy"
        },
        {
            $project: {
                thumbnail:1,
                videoFile:1,
                title:1,
                description:1,
                createdBy:{
                    fullName:1,
                    username:1,
                    avatar:1
                }
            }
        },
        {
            $sort: {
                [sortBy]: sortType === 'asc' ? 1 : -1
            }
        },
        {
            $skip: (page - 1)*limit
        },
        {
            $limit: parseInt(limit)
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, videos, "All videos"))   
})

const publishVideo = asyncHandler ( async (req, res) => {

    // get title & description from body
    const { title, description} = req.body

    if (!(title || description)) {
        throw new ApiError(400, "Title or Description are required")
    }

    // get videoFile from files request
    const localVideoFilePath = req?.files?.videoFile[0]?.path

    if (!localVideoFilePath) {
        throw new ApiError(400, "video file is not found")
    }

    // upload videoFile in cloudinary
    const videoFile = await uploadOnCloudinary(localVideoFilePath)

    if (!videoFile.url) {
        throw new ApiError(400, "uploading video file is failed")
    }

    // get thumbnail from files request
    const thumbnailLocalPath = req?.files?.thumbnail[0]?.path

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "video file is not found")
    }

    // upload thumbnail files in cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    
    if (!thumbnail.url) {
        throw new ApiError(400, "uploading thumbnail file is failed")
    }

    // save video
    const saveVideo = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration: videoFile.duration,
        owner: req.user?._id
    })

    if (!saveVideo) {
        throw new ApiError(500, "erro while uploading video")
    }

    // send response
    return res
    .status(200)
    .json(new ApiResponse(200, saveVideo, "Video successfully uploaded"))

})

const getVideoById = asyncHandler ( async (req, res) => {
    
    //TODO: get video by id
    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "videoId required to get video details")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(400, "video is not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"))

})

const updateVideo = asyncHandler ( async (req, res) => {
    // get videoId from req
    const { videoId } = req.params

    const { title, description } = req.body

    // find video using id
    const video = await Video.findById(videoId)

    if (!((video.owner).equals(req.user?._id))) {
        throw new ApiError(400, "You are not updating video")
    }

    // delete old thumbnail from cloudinary
    const deleteOldThumbnail = await deleteInCloudinary(video.thumbnail)
    
    if (deleteOldThumbnail.result !== 'ok' ) {
        throw new ApiError(400,"old thumbnail not deleted")
    }

    const thumbnailLocalPath = req.file?.path
    
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail file is missing")
    }
    
    // upload new thumbnail on cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!thumbnail.url) {
        throw new ApiError(400, "Error while uploading thumbnail")
    }

    // update video details
    const videoUpdate = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail.url
            }
        },
        { new: true }
    )

    return res
    .status(200)
    .json(new ApiResponse(200, videoUpdate, "Video details update successfully"))

})

const deleteVideo = asyncHandler ( async (req, res) => {
    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400,"Please give video Id")
    }

    const video = await Video.findById(videoId)

    if (!((video.owner).equals(req.user?._id))) {
        throw new ApiError(400, "You are not deleting video")
    }

    // delete videofile from cloudinary
    const videoDelete = await deleteInCloudinary(video.videoFile)

    if (videoDelete.result !== 'ok') {
        throw new ApiError(400,"Not able to delete video file")
    }

    // delete thumbnail from cloudinary
    const thumdDelete = await deleteInCloudinary(video.thumbnail)

    if (thumdDelete.result !== 'ok') {
        throw new ApiError(400,"Not able to delete thumbnail file")
    }

    // delete video based on id
    const deleteVideo = await Video.findByIdAndDelete(videoId)

    return res
    .status(200)
    .json(new ApiResponse(200, {deleteVideo}, "video successfully deleted"))

})

const togglePublishStatus = asyncHandler ( async (req, res) => {    
    const { videoId } = req.params

    const video = await Video.findById(videoId)

    if (!((video.owner).equals(req.user?._id))) {
        throw new ApiError(400, "You are not owner of current video")
    }

    const videoChange = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        { new: true }
    )

    return res
    .status(200)
    .json(new ApiResponse(200, videoChange, "changed view of publication"))

})

export {
    getAllVideos,
    publishVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}