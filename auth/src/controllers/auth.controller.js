const userModel = require('../models/user.model');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const tokenBlacklist = require('../db/tokenBlacklist');
const { publishToQueue } = require('../broker/broker');

async function registerUser(req, res) {
    const {
      username,
      email,
      password,
      role,
      fullName = {},
    } = req.body;

    const { firstName, lastName } = fullName;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required",
      });
    }
    const isUserAlreadyExists = await userModel.findOne({
      $or: [{ username }, { email }],
    });

    if (isUserAlreadyExists) {
      return res.status(400).json({
        message: "User with given username or email already exists",
      });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      username,
      email,
      password: hash,
      fullName: {
        firstName,
        lastName,
      },
      role: role || "user",
    });
     await publishToQueue("AUTH_NOTIFICATION.USER_CREATED", {
      id: user._id,
      username: user.username,
      email:user.email,
      fullName:user.fullName

     })
    const accessToken = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const refreshToken = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        addresses: user.addresses || [],
      }
    });
  
}

async function loginUser(req, res) {
  const { username, email, password } = req.body;

  try {
    if ((!username && !email) || !password) {
      return res.status(400).json({
        message: "Username or email and password are required",
      });
    }

    const user = await userModel.findOne({
      $or: [{ username }, { email }],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials " });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

async function getCurrentUser(req, res) {
  // Return the authenticated user object directly
  return res.status(200).json(req.user);
}

async function logoutUser(req, res) {
  try {
    let token = null;
    if (req.cookies && req.cookies.token) token = req.cookies.token;
    const authHeader = req.headers && req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.decode(token) || {};
      if (decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await tokenBlacklist.add(token, ttl);
        }
      } else {
        await tokenBlacklist.add(token);
      }
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
    });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: "Server error" });
  }
}


async function getUserAddresses(req, res) {
  const id  = req.user.id;
  const user  = await userModel.findById(id).select('addresses');
  if(!user){
    return res.status(404).json({
      message:"User not found"
    })
  }
  return res.status(200).json(user.addresses)
}

async function addUserAddress(req, res) {
 const id = req.user.id;
 const {street,city,state,pincode,country,isDeafult} = req.body;
 const user = await userModel.findOneAndUpdate(
  {_id:id},
  {
    $push:{addresses:{street,
      city,
      state,
      pincode,
      country,
      isDeafult}}
  },{ new:true }
 )
 if(!user){
  return res.status(404).json({
    message:"user not found"
  })

 }
 return res.status(201).json(user.addresses[user.addresses.length -1])
}

async function deleteUserAddress(req, res) {
  try {
    const id = req.user.id;
    const {addressId} = req.params;

    // Validate ObjectId format
    if (!addressId || !/^[0-9a-fA-F]{24}$/.test(addressId)) {
      return res.status(400).json({
        message: 'Invalid address id'
      });
    }

    // First check if address exists before deletion
    const userBefore = await userModel.findById(id);
    if (!userBefore) {
      return res.status(404).json({
        message: "user not found"
      });
    }

    const addressIndex = userBefore.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      // Check if address exists for another user (forbidden case)
      const owner = await userModel.findOne({ 'addresses._id': addressId });
      if (owner && owner._id.toString() !== id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      // Address doesn't exist for anyone
      return res.status(404).json({
        message: "Address not found"
      });
    }

    // Delete the address
    const user = await userModel.findOneAndUpdate(
      { _id: id },
      {
        $pull: {
          addresses: {
            _id: addressId
          }
        }
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Address deleted successfully"
    });
  } catch (err) {
    console.error('deleteUserAddress error', err);
    return res.status(500).json({ message: 'Server error' });
  }
}
module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  getUserAddresses,
  addUserAddress,
  deleteUserAddress,
};