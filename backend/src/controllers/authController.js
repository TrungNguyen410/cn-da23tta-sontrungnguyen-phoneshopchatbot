const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const register = asyncHandler(async (req, res) => {
  const result = await authService.requestRegistrationOtp(req.body);
  successResponse(res, result, 'Registration OTP sent', 202);
});

const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  const session = await authService.verifyRegistrationOtp(req.body);
  successResponse(res, session, 'Registration verified', 201);
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body);
  successResponse(res, result, 'Password reset OTP requested');
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  successResponse(res, result, 'Password reset successful');
});

const login = asyncHandler(async (req, res) => {
  const session = await authService.login(req.body);
  successResponse(res, session, 'Login successful');
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.id);
  successResponse(res, user, 'Current user retrieved');
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);
  successResponse(res, user, 'Profile updated');
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.body);
  successResponse(res, result, 'Password changed');
});

const wishlist = asyncHandler(async (req, res) => {
  const items = await authService.getWishlist(req.user.id);
  successResponse(res, items, 'Wishlist retrieved');
});

const updateWishlist = asyncHandler(async (req, res) => {
  const items = await authService.updateWishlist(req.user.id, req.body.items);
  successResponse(res, items, 'Wishlist updated');
});

const refresh = asyncHandler(async (req, res) => {
  const session = await authService.refresh(req.body.refreshToken);
  successResponse(res, session, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout(req.body.refreshToken);
  successResponse(res, result, 'Logout successful');
});

module.exports = {
  register,
  verifyRegistrationOtp,
  requestPasswordReset,
  resetPassword,
  login,
  me,
  updateProfile,
  changePassword,
  wishlist,
  updateWishlist,
  refresh,
  logout,
};
