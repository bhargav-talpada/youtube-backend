import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"
import { json } from "express"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if (!(name || description)) {
        throw new ApiError(400, "All fields are required")
    }

    // create playlist
    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    if (!playlist) {
        throw new ApiError(400, "Erro while creating playlist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created"))
    
})

const getUserPlaylists = asyncHandler(async (req, res) => {2
    const {userId} = req.params

    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "userId is not valid")
    }

    const user = await User.findById(userId)

    if (!user) {
        throw new ApiError(400, "user not found")
    }

    const playlist = await Playlist.find({owner:userId})

    if (!playlist) {
        throw new ApiError(400, "this user have not any playlist yet")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "User playlist fetched successfully"))
    
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(400, "playlist not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist fetched successfully"))

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid id")
    }

    const playlistExists = await Playlist.findById(playlistId)

    if (!playlistExists) {
        throw new ApiError(400, "playlist does not exists")
    }

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid id")
    }

    const videoExists = await Video.findById(videoId)

    if (!videoExists) {
        throw new ApiError(400, "video does not exists")
    }

    if (!((playlistExists.owner).equals(req.user?._id))) {
        throw new ApiError(408, "You can not add video in this playlist");   
    }

    if (playlistExists?.videos.includes(videoId)) {
        throw new ApiError(400, "this video is already in this playlist")      
    }

    const isAdd = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos:videoId
            }
        },
        { new: true }
    )

    if (!isAdd) {
        throw new ApiError(500, "something went wrong while adding your video in playlist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, isAdd, "video added successfully to playlist "))

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    
    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid id")
    }

    const playlistExists = await Playlist.findById(playlistId)

    if (!playlistExists) {
        throw new ApiError(400, "playlist does not exists")
    }

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid id")
    }

    const videoExists = await Video.findById(videoId)

    if (!videoExists) {
        throw new ApiError(400, "video does not exists")
    }

    if (!((playlistExists.owner).equals(req.user?._id))) {
        throw new ApiError(408, "You can not delete video in this playlist");   
    }

    if (!playlistExists?.videos.includes(videoId)) {
        throw new ApiError(400, "this video you want to remove is not present in playlist")      
    }

    const removed = await Playlist.findByIdAndDelete(
        playlistId,
        {
            $pull:{
                videos:{
                    $in:[`${videoId}`]
                }
            }
        },
        { new: true }
    )

    if (!removed) {
        throw new ApiError(400, "something went wrong while removing video from playlist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, removed, "video removed"))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "playlist not found")
    }

    if(!((playlist.owner).equals(req.user?._id))){
        throw new ApiError(408,"You are not owner of the playlist can't delete") 
    }

   const isDelete = await Playlist.findByIdAndDelete(playlistId)

   if(!isDelete){
    throw new ApiErrors(500,"something went wrong when deleting the playlist")
   }

   return res
   .status(200)
   .json(new ApiResponse(200, isDelete, "playlist deleted"))

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    
    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "invalid id")
    }

    if (!(name || description)) {
        throw new ApiError(400, "all fields are required")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "playlist not found")
    }

    if(!((playlist.owner).equals(req.user?._id))){
        throw new ApiError(400,"You are not owner of the playlist can't update") 
    }

    const updatePlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name: name || playlist?.name,
                description: description || playlist?.description
            }
        },
        { new: true }
    )

    if (!updatePlaylist) {
        throw new ApiError(500, "something went wrong while updating playlist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatePlaylist, "playlist update"))

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}