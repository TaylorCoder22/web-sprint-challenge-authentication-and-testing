const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {jwtSecret} = require('../../config/secrets')
const router = require('express').Router()
const Users = require('../users/users-model')
const checkInputType = require('../middleware/checkInputType')

const checkPayload = (req, res, next) => {
    if(!req.body.username || !req.body.password){
        res.status(401).json('username and password required')
    }else{
        next()
    }
}

const checkUserInDB = async (req, res, next) => {
    try{
        const rows = await Users.findBy({username: req.body.username})
        if(!rows.length){
            next()
        }else{
            res.status(401).json('username taken')
        }
    }catch(err){
        res.status(500).json(`Server error: ${err.message}`)
    }
}

const checkUserExists = async (req, res, next) => {
    try{
        const rows = await Users.findBy({username: req.body.username})
        if(rows.length){
            req.userData = rows[0]
            next()
        }else{
            res.status(401).json('invalid credentials')
        }
    }
    catch(err){
        res.status(500).json(`Server error: ${err.message}`)
    }
}

router.post('/register', checkPayload, checkInputType, checkUserInDB, async (req, res) => {
    try{
        const hash = bcrypt.hashSync(req.body.password, 8)
        const newUser = await Users.add({username: req.body.username, password: hash})
        res.status(201).json(newUser)
    }catch(err){
        res.status(500).json({message: err.message})
    }
})

router.post('/login', checkPayload, checkUserExists, (req, res, next) => {
    let {username, password} = req.body
    Users.findBy({username})
    .then(([user]) => {
        if(user && bcrypt.compareSync(password, user.password)){
            const token = makeToken(user)
            res.status(200).json({message: `Welcome ${user.username}!`, token})
        }else{
            res.status(401).json({message: 'Invalid credentials'})
        }
    })
    .catch(next)
})

function makeToken(user){
    const payload = {
        subject: user.id,
        username: user.username
    }
    const options = {
        expiresIn: '1d'
    }
    return jwt.sign(payload, jwtSecret, options)
}

module.exports = router