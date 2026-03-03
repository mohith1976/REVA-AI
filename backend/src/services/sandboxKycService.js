const axios = require('axios');
const { logger } = require('../utils/logger');

const API_KEY = process.env.SANDBOX_API_KEY;
const SECRET_KEY = process.env.SANDBOX_SECRET_KEY;
const BASE_URL = 'https://api.sandbox.co.in';

let accessToken = null;
let tokenExpiry = null;

/**
 * Authenticate with Sandbox and get Access Token
 * Token usually lasts 24 hours
 */
async function authenticate() {
    try {
        const { data } = await axios.post(`${BASE_URL}/authenticate`, {}, {
            headers: {
                'x-api-key': API_KEY,
                'x-api-secret': SECRET_KEY,
                'x-api-version': '1.0.0'
            }
        });

        if (data && data.access_token) {
            accessToken = data.access_token;
            // Set expiry to 23 hours from now to be safe
            tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
            return accessToken;
        }
        throw new Error('Authentication failed: No access token in response');
    } catch (err) {
        logger.error('Sandbox Auth Failed:', err.response?.data || err.message);
        throw new Error('Failed to authenticate with Sandbox API');
    }
}

/**
 * Get a valid access token, re-authenticate if expired
 */
async function getAccessToken() {
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return accessToken;
    }
    return await authenticate();
}

/**
 * Common request helper with auth headers
 */
async function sandboxReq(method, path, body) {
    const token = await getAccessToken();
    return await axios({
        method,
        url: `${BASE_URL}${path}`,
        data: body,
        headers: {
            'Authorization': token,  // No 'Bearer' prefix as per Sandbox docs
            'x-api-key': API_KEY,
            'x-api-version': '1.0.0',
            'Content-Type': 'application/json'
        }
    });
}

/**
 * Generate Aadhaar OTP via Sandbox
 * Endpoint: POST /kyc/aadhaar/okyc/otp
 * @param {string} aadhaarNumber - 12 digit Aadhaar number
 * @returns {Promise<{taskId: string, provider: string, message: string}>}
 */
async function sendAadhaarOtp(aadhaarNumber) {
    try {
        const { data } = await sandboxReq('POST', '/kyc/aadhaar/okyc/otp', {
            "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request",
            "aadhaar_number": aadhaarNumber,
            "consent": "Y",
            "reason": "For identity verification on REVA Portal"
        });

        // reference_id is returned as a number; store as string for safety
        const referenceId = String(data.data?.reference_id || data.reference_id || '');

        if (!referenceId) {
            throw new Error('No reference_id received from Sandbox');
        }

        return {
            provider: 'sandbox',
            taskId: referenceId, // Stored as string in pendingAadhaarTasks
            message: 'OTP sent to your Aadhaar-linked mobile number'
        };
    } catch (err) {
        const errorData = err.response?.data;
        logger.error('Sandbox Aadhaar Generate OTP Failed:', errorData || err.message);
        const msg = errorData?.message || errorData?.error?.message || 'Failed to send Aadhaar OTP';
        throw new Error(msg);
    }
}

/**
 * Verify Aadhaar OTP via Sandbox
 * Endpoint: POST /kyc/aadhaar/okyc/otp/verify
 * @param {string} aadhaarNumber - 12 digit Aadhaar number
 * @param {string} otp - 6 digit OTP
 * @param {string} referenceId - Reference ID string from generate-otp
 * @returns {Promise<{verified: boolean, name?: string, rawData?: any}>}
 */
async function verifyAadhaarOtp(aadhaarNumber, otp, referenceId) {
    try {
        const { data } = await sandboxReq('POST', '/kyc/aadhaar/okyc/otp/verify', {
            "@entity": "in.co.sandbox.kyc.aadhaar.okyc.request",
            "reference_id": String(referenceId), // Must be a string
            "otp": String(otp)                   // Must be a string
        });

        // Per sandbox docs, response is in data.data
        const result = data.data;

        if (result && result.status === 'VALID') {
            return {
                verified: true,
                name: result.name || result.full_name || null,
                dob: result.date_of_birth,
                gender: result.gender,
                address: result.full_address,
                aadhaarMasked: `XXXX-XXXX-${aadhaarNumber.slice(-4)}`,
                rawData: result
            };
        }

        return { verified: false };
    } catch (err) {
        const errorData = err.response?.data;
        logger.error('Sandbox Aadhaar Verify OTP Failed:', errorData || err.message);
        const msg = errorData?.message || errorData?.error?.message || 'OTP verification failed. Please check the code and try again.';
        throw new Error(msg);
    }
}

module.exports = {
    sendAadhaarOtp,
    verifyAadhaarOtp
};
