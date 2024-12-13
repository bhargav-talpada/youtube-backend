// ------ 1st : using promises ------s

const asyncHandler = (reqestHandler) => {
    return (req, res, next) => {
        Promise.resolve(reqestHandler(req, res, next)).catch((err) => next(err))
    }
}

export { asyncHandler }

/*

------ 2nd : try catch handler ------

// higher order function
// below line look like const asyncHandler = (fn) => async {() => {}}

const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next)
    } catch (error) {
        res.status(err.code || 500).json({
            success: false,
            message: err.message
        })
    }
}
*/