export interface CreateUserDto {
  email: string;
  password: string;
  role?: string;
  firstName: string;
  lastName: string;
}

export interface UserResponse {
  _id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  user: UserResponse;
  access_token: string;
}

export interface LoginDto {
  email: string;
  password: string;
}
