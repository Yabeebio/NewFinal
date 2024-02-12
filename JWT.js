const { sign, verify } = require("jsonwebtoken");

const createTokens = (user) => {
    const accessToken = sign({
        id: user._id,
        email: user.email,
        admin: user.admin
    }, "SECRET");
    return accessToken;
};

const validateToken = (req, res, next) => {

    const accessToken = req.cookies["access_token"];
    console.log(accessToken);
    if (!accessToken)
        return res.status(400).json({ error: "User not authenticated" })
    try {
        const validToken = verify(accessToken, "SECRET");
        if (validToken) {
            req.authenticated = true;
            return next();
        }
    }
    catch (error) {
        return res.status(400).json({ error: error});
    }
};

module.exports = { createTokens, validateToken };