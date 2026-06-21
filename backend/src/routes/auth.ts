import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'anime_recommender_secure_secret_key_12345!';

// SIGNUP Route
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, favoriteGenres } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Format genres array as comma separated string
    const genresStr = Array.isArray(favoriteGenres) ? favoriteGenres.join(',') : '';

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        favoriteGenres: genresStr
      }
    });

    // Create token
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        favoriteGenres: newUser.favoriteGenres.split(',').filter(Boolean),
        createdAt: newUser.createdAt
      }
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error during signup' });
  }
});

// LOGIN Route
router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required' });
    }

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        favoriteGenres: user.favoriteGenres.split(',').filter(Boolean),
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// PROFILE Route
router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      favoriteGenres: user.favoriteGenres.split(',').filter(Boolean),
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ error: 'Internal server error fetching profile' });
  }
});

// UPDATE PROFILE Route
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { email, favoriteGenres, password } = req.body;

    const dataToUpdate: any = {};
    
    if (email) dataToUpdate.email = email;
    if (Array.isArray(favoriteGenres)) {
      dataToUpdate.favoriteGenres = favoriteGenres.join(',');
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.passwordHash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: dataToUpdate
    });

    return res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        favoriteGenres: updatedUser.favoriteGenres.split(',').filter(Boolean),
        createdAt: updatedUser.createdAt
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Internal server error updating profile' });
  }
});

export default router;
