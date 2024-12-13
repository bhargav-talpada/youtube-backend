import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if (!videoId) {
        throw new ApiError(400, "no video found with this id")
    }

    const comments = await Comment.aggregate([
        {
            $match:{
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"createdBy",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            fullName:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                createdBy:{
                    $first:"$createdBy"
                }
            }
        },
        {
            $unwind:"$createdBy"
        },
        {
            $project:{
                content:1,
                createdBy:1
            }
        },
        {
            $skip:(page-1)*limit
        },
        {
            $limit: parseInt(limit)
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, comments, "successfully fetched video comment"))

})

const addComment = asyncHandler(async (req, res) => {
    // get videoId and content from request
    const { videoId } = req.params
    const { content } = req.body

    // find video by id
    const video = await Video.findById(videoId)

    if ( !video ) {
        throw new ApiError(400, "not getting any video")
    }

    if ( !content ) {
        throw new ApiError(400, "content is required")
    }

    // create comment
    const comment = await Comment.create({
        content,
        video: video._id,
        owner: req.user?._id
    })

    if ( !comment ) {
        throw new ApiError(400, "uploading comment failed")
    }

    return res
    .status(200)
    .json( new ApiResponse(200, comment, "comment upload successfully"))
     
})

const updateComment = asyncHandler(async (req, res) => {
    const { content } = req.body

    if ( !content ) {
        throw new ApiError(400, "content is required")
    }

    const { commentId } = req.params

    const comment = await Comment.findById(commentId)

    if ( !comment ) {
        throw new ApiError(400, "comment is not found")
    }

    if (!((comment.owner).equals(req.user?._id))) {
        throw new ApiError(400, "You can not updating this comment");  
    }

    const newComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content
            }
        },
        { new: true }
    )

    return res
    .status(200)
    .json(new ApiResponse(200, newComment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    const comment = await Comment.findById(commentId)

    if ( !comment ) {
        throw new ApiError(400, "comment is not found")
    }

    if (!((comment.owner).equals(req.user?._id))) {
        throw new ApiError(400, "You can not delete this comment");
    }    

    const deleteComment = await Comment.findByIdAndDelete(commentId)
    
    if ( !deleteComment ) {
        throw new ApiError(400, "error while deleting comment")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, deleteComment, "comment successfully deleted"))

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }