import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserModel, IUser } from '../models/user.model';
import { jwtConfig } from '../config/jwt.config';
import { UnauthorizedException, BadRequestException } from '../../../exceptions';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    agencyId?: string;
  };
}

export class AuthService {
  /**
   * Login de usuário
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const { email, password } = dto;

    // Buscar usuário
    const user = await UserModel.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar se está ativo
    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    // Validar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Atualizar último login
    user.lastLogin = new Date();
    await user.save();

    // Gerar token
    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agencyId?.toString(),
      },
    };
  }

  /**
   * Registro de novo usuário
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const { email, password, name, phone } = dto;

    // Verificar se email já existe
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('Email já cadastrado');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = await UserModel.create({
      email,
      password: hashedPassword,
      name,
      phone,
      role: 'viewer', // Novo usuário começa como viewer
      isActive: true,
    });

    // Gerar token
    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agencyId?.toString(),
      },
    };
  }

  /**
   * Validar token JWT
   */
  async validateToken(token: string): Promise<IUser> {
    try {
      const decoded = jwt.verify(token, jwtConfig.secret) as { userId: string };
      const user = await UserModel.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Token inválido');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  /**
   * Gerar token JWT
   */
  private generateToken(user: IUser): string {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      agencyId: user.agencyId?.toString(),
    };

    return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
  }

  /**
   * Refresh token (renova token expirado)
   */
  async refreshToken(userId: string): Promise<AuthResponse> {
    const user = await UserModel.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário inválido');
    }

    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agencyId?.toString(),
      },
    };
  }
}

export const authService = new AuthService();
