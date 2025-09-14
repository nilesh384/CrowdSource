import dbConnect from "../db/dbConnect.js";
import { uploadOnCloudinary } from "../services/cloudinary.js";

// Create a new report
const createReport = async (req, res) => {
    try {
        const {
            userId,
            title,
            description,
            category,
            priority,
            mediaUrls = [],
            audioUrl,
            latitude,
            longitude,
            address,
            department
        } = req.body;

        // Use either format for userId
        const actualUserId = userId;
        // Use either format for mediaUrls
        const actualMediaUrls = mediaUrls.length > 0 ? mediaUrls : [];
        // Use either format for audioUrl
        const actualAudioUrl = audioUrl || null;

        // Validation
        if (!actualUserId || !title) {
            return res.status(400).json({
                success: false,
                message: "User ID and title are required"
            });
        }

        console.log('📝 Creating new report for user:', actualUserId);

        const client = await dbConnect();

        try {
            // Check if user exists
            const userCheckQuery = `SELECT id FROM users WHERE id = $1`;
            const userExists = await client.query(userCheckQuery, [actualUserId]);

            if (userExists.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Create the report
            const insertQuery = `
                INSERT INTO reports (
                    user_id,
                    title,
                    description,
                    category,
                    priority,
                    media_urls,
                    audio_url,
                    latitude,
                    longitude,
                    address,
                    department
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `;

            const result = await client.query(insertQuery, [
                actualUserId,
                title,
                description || '',
                category || 'other',
                priority || 'medium',
                actualMediaUrls,
                actualAudioUrl || null,
                latitude || null,
                longitude || null,
                address || '',
                department || 'General'
            ]);

            const newReport = result.rows[0];

            // Update user's total_reports count
            const updateUserQuery = `
                UPDATE users 
                SET total_reports = total_reports + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;
            await client.query(updateUserQuery, [actualUserId]);

            console.log('✅ Report created successfully:', newReport.id);

            // Map database fields to camelCase
            const mappedReport = {
                id: newReport.id,
                userId: newReport.user_id,
                title: newReport.title,
                description: newReport.description,
                category: newReport.category,
                priority: newReport.priority,
                mediaUrls: newReport.media_urls,
                audioUrl: newReport.audio_url,
                latitude: newReport.latitude,
                longitude: newReport.longitude,
                address: newReport.address,
                department: newReport.department,
                isResolved: newReport.is_resolved,
                createdAt: newReport.created_at,
                resolvedAt: newReport.resolved_at,
                timeTakenToResolve: newReport.time_taken_to_resolve
            };

            res.status(201).json({
                success: true,
                message: 'Report created successfully',
                report: mappedReport
            });

        } finally {
            client.end();
        }

    } catch (error) {
        console.error('❌ Error creating report:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating report',
            error: error.message
        });
    }
};

// Get all reports for a specific user
const getUserReports = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isResolved, category, priority, limit = 50, offset = 0 } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        console.log('🔍 Fetching reports for user:', userId);

        const client = await dbConnect();

        try {
            // Build dynamic query based on filters
            let baseQuery = `SELECT * FROM reports WHERE user_id = $1`;
            const queryParams = [userId];
            let paramIndex = 2;

            if (isResolved !== undefined) {
                baseQuery += ` AND is_resolved = $${paramIndex}`;
                queryParams.push(isResolved === 'true');
                paramIndex++;
            }

            if (category) {
                baseQuery += ` AND category = $${paramIndex}`;
                queryParams.push(category);
                paramIndex++;
            }

            if (priority) {
                baseQuery += ` AND priority = $${paramIndex}`;
                queryParams.push(priority);
                paramIndex++;
            }

            baseQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            queryParams.push(parseInt(limit), parseInt(offset));

            const result = await client.query(baseQuery, queryParams);

            // Map all reports to camelCase
            const mappedReports = result.rows.map(report => ({
                id: report.id,
                userId: report.user_id,
                title: report.title,
                description: report.description,
                category: report.category,
                priority: report.priority,
                mediaUrls: report.media_urls,
                audioUrl: report.audio_url,
                latitude: report.latitude,
                longitude: report.longitude,
                address: report.address,
                department: report.department,
                isResolved: report.is_resolved,
                createdAt: report.created_at,
                resolvedAt: report.resolved_at,
                timeTakenToResolve: report.time_taken_to_resolve
            }));

            console.log(`✅ Found ${mappedReports.length} reports for user`);

            res.status(200).json({
                success: true,
                reports: mappedReports,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: mappedReports.length
                }
            });

        } finally {
            client.end();
        }

    } catch (error) {
        console.error('❌ Error fetching user reports:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching reports',
            error: error.message
        });
    }
};

// Get a specific report by ID
const getReportById = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { userId } = req.query; // Optional: to ensure user owns the report

        if (!reportId) {
            return res.status(400).json({
                success: false,
                message: "Report ID is required"
            });
        }

        console.log('🔍 Fetching report:', reportId);

        const client = await dbConnect();

        try {
            let query = `SELECT * FROM reports WHERE id = $1`;
            const queryParams = [reportId];

            // If userId is provided, ensure the report belongs to the user
            if (userId) {
                query += ` AND user_id = $2`;
                queryParams.push(userId);
            }

            const result = await client.query(query, queryParams);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Report not found'
                });
            }

            const report = result.rows[0];

            // Map to camelCase
            const mappedReport = {
                id: report.id,
                userId: report.user_id,
                title: report.title,
                description: report.description,
                category: report.category,
                priority: report.priority,
                mediaUrls: report.media_urls,
                audioUrl: report.audio_url,
                latitude: report.latitude,
                longitude: report.longitude,
                address: report.address,
                department: report.department,
                isResolved: report.is_resolved,
                createdAt: report.created_at,
                resolvedAt: report.resolved_at,
                timeTakenToResolve: report.time_taken_to_resolve
            };

            console.log('✅ Report found:', reportId);

            res.status(200).json({
                success: true,
                report: mappedReport
            });

        } finally {
            client.end();
        }

    } catch (error) {
        console.error('❌ Error fetching report:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching report',
            error: error.message
        });
    }
};

// Update a report
const updateReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const {
            title,
            description,
            category,
            priority,
            mediaUrls,
            audioUrl,
            latitude,
            longitude,
            address,
            department,
            userId // To ensure user owns the report
        } = req.body;

        if (!reportId) {
            return res.status(400).json({
                success: false,
                message: "Report ID is required"
            });
        }

        console.log('📝 Updating report:', reportId);

        const client = await dbConnect();

        try {
            // Check if report exists and belongs to user (if userId provided)
            let checkQuery = `SELECT * FROM reports WHERE id = $1`;
            const checkParams = [reportId];

            if (userId) {
                checkQuery += ` AND user_id = $2`;
                checkParams.push(userId);
            }

            const existingReport = await client.query(checkQuery, checkParams);

            if (existingReport.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Report not found or access denied'
                });
            }

            // Check if report is already resolved
            if (existingReport.rows[0].is_resolved) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot update a resolved report'
                });
            }

            // Build dynamic update query
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;

            if (title !== undefined) {
                updateFields.push(`title = $${paramIndex}`);
                updateValues.push(title);
                paramIndex++;
            }

            if (description !== undefined) {
                updateFields.push(`description = $${paramIndex}`);
                updateValues.push(description);
                paramIndex++;
            }

            if (category !== undefined) {
                updateFields.push(`category = $${paramIndex}`);
                updateValues.push(category);
                paramIndex++;
            }

            if (priority !== undefined) {
                updateFields.push(`priority = $${paramIndex}`);
                updateValues.push(priority);
                paramIndex++;
            }

            if (mediaUrls !== undefined) {
                updateFields.push(`media_urls = $${paramIndex}`);
                updateValues.push(mediaUrls);
                paramIndex++;
            }

            if (audioUrl !== undefined) {
                updateFields.push(`audio_url = $${paramIndex}`);
                updateValues.push(audioUrl);
                paramIndex++;
            }

            if (latitude !== undefined) {
                updateFields.push(`latitude = $${paramIndex}`);
                updateValues.push(latitude);
                paramIndex++;
            }

            if (longitude !== undefined) {
                updateFields.push(`longitude = $${paramIndex}`);
                updateValues.push(longitude);
                paramIndex++;
            }

            if (address !== undefined) {
                updateFields.push(`address = $${paramIndex}`);
                updateValues.push(address);
                paramIndex++;
            }

            if (department !== undefined) {
                updateFields.push(`department = $${paramIndex}`);
                updateValues.push(department);
                paramIndex++;
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No fields to update'
                });
            }

            const updateQuery = `
                UPDATE reports 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `;

            updateValues.push(reportId);

            const result = await client.query(updateQuery, updateValues);
            const updatedReport = result.rows[0];

            // Map to camelCase
            const mappedReport = {
                id: updatedReport.id,
                userId: updatedReport.user_id,
                title: updatedReport.title,
                description: updatedReport.description,
                category: updatedReport.category,
                priority: updatedReport.priority,
                mediaUrls: updatedReport.media_urls,
                audioUrl: updatedReport.audio_url,
                latitude: updatedReport.latitude,
                longitude: updatedReport.longitude,
                address: updatedReport.address,
                department: updatedReport.department,
                isResolved: updatedReport.is_resolved,
                createdAt: updatedReport.created_at,
                resolvedAt: updatedReport.resolved_at,
                timeTakenToResolve: updatedReport.time_taken_to_resolve
            };

            console.log('✅ Report updated successfully:', reportId);

            res.status(200).json({
                success: true,
                message: 'Report updated successfully',
                report: mappedReport
            });

        } finally {
            client.end();
        }

    } catch (error) {
        console.error('❌ Error updating report:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating report',
            error: error.message
        });
    }
};

// Mark report as resolved
const resolveReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { userId } = req.body; // Optional: to ensure user owns the report

        if (!reportId) {
            return res.status(400).json({
                success: false,
                message: "Report ID is required"
            });
        }

        console.log('✅ Resolving report:', reportId);

        const client = await dbConnect();

        try {
            // Check if report exists and belongs to user (if userId provided)
            let checkQuery = `SELECT * FROM reports WHERE id = $1`;
            const checkParams = [reportId];

            if (userId) {
                checkQuery += ` AND user_id = $2`;
                checkParams.push(userId);
            }

            const existingReport = await client.query(checkQuery, checkParams);

            if (existingReport.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Report not found or access denied'
                });
            }

            if (existingReport.rows[0].is_resolved) {
                return res.status(400).json({
                    success: false,
                    message: 'Report is already resolved'
                });
            }

            // Mark as resolved
            const resolveQuery = `
                UPDATE reports 
                SET is_resolved = true,
                    resolved_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            const result = await client.query(resolveQuery, [reportId]);
            const resolvedReport = result.rows[0];

            // Update user's resolved_reports count
            const updateUserQuery = `
                UPDATE users 
                SET resolved_reports = resolved_reports + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;
            await client.query(updateUserQuery, [resolvedReport.user_id]);

            // Map to camelCase
            const mappedReport = {
                id: resolvedReport.id,
                userId: resolvedReport.user_id,
                title: resolvedReport.title,
                description: resolvedReport.description,
                category: resolvedReport.category,
                priority: resolvedReport.priority,
                mediaUrls: resolvedReport.media_urls,
                audioUrl: resolvedReport.audio_url,
                latitude: resolvedReport.latitude,
                longitude: resolvedReport.longitude,
                address: resolvedReport.address,
                department: resolvedReport.department,
                isResolved: resolvedReport.is_resolved,
                createdAt: resolvedReport.created_at,
                resolvedAt: resolvedReport.resolved_at,
                timeTakenToResolve: resolvedReport.time_taken_to_resolve
            };

            console.log('✅ Report resolved successfully:', reportId);

            res.status(200).json({
                success: true,
                message: 'Report marked as resolved',
                report: mappedReport
            });

        } finally {
            client.end();
        }

    } catch (error) {
        console.error('❌ Error resolving report:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while resolving report',
            error: error.message
        });
    }
};

// Delete a report
const deleteReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { userId } = req.query; // Get from query params (optional for authorization)

        if (!reportId) {
            return res.status(400).json({
                success: false,
                message: "Report ID is required"
            });
        }

        console.log('🗑️ Deleting report:', reportId, userId ? `by user: ${userId}` : '(admin delete)');

        const client = await dbConnect();

        try {
            // First, get the report to check ownership and get user_id
            const getReportQuery = `SELECT * FROM reports WHERE id = $1`;
            const reportResult = await client.query(getReportQuery, [reportId]);

            if (reportResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Report not found'
                });
            }

            const report = reportResult.rows[0];

            // If userId is provided, check if user owns the report
            if (userId && report.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: You can only delete your own reports'
                });
            }

            // Delete the report
            const deleteQuery = `DELETE FROM reports WHERE id = $1 RETURNING *`;
            const result = await client.query(deleteQuery, [reportId]);
            const deletedReport = result.rows[0];

            // Update user's total_reports count
            const updateUserQuery = `
                UPDATE users 
                SET total_reports = GREATEST(total_reports - 1, 0),
                    resolved_reports = CASE 
                        WHEN $2 THEN GREATEST(resolved_reports - 1, 0)
                        ELSE resolved_reports 
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;
            await client.query(updateUserQuery, [report.user_id, report.is_resolved]);

            console.log('✅ Report deleted successfully:', reportId);

            res.status(200).json({
                success: true,
                message: 'Report deleted successfully',
                deletedReportId: reportId
            });

        } finally {
            client.end();
        }

    } catch (error) {
        console.error('❌ Error deleting report:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting report',
            error: error.message
        });
    }
};

// Get nearby reports (for social feed)
const getNearbyReports = async (req, res) => {
    try {
        const { latitude, longitude, radius = 10, limit = 20, offset = 0 } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: "Latitude and longitude are required"
            });
        }

        console.log(`🌍 Fetching reports within ${radius}km of (${latitude}, ${longitude})`);

        const client = await dbConnect();

        try {
            // Using the haversine formula to calculate distance
            const nearbyQuery = `
                SELECT r.*, u.full_name as user_name,
                    (6371 * acos(cos(radians($1)) * cos(radians(r.latitude)) * 
                    cos(radians(r.longitude) - radians($2)) + 
                    sin(radians($1)) * sin(radians(r.latitude)))) AS distance
                FROM reports r
                JOIN users u ON r.user_id = u.id
                WHERE r.latitude IS NOT NULL 
                    AND r.longitude IS NOT NULL
                    AND (6371 * acos(cos(radians($1)) * cos(radians(r.latitude)) * 
                         cos(radians(r.longitude) - radians($2)) + 
                         sin(radians($1)) * sin(radians(r.latitude)))) <= $3
                ORDER BY distance ASC, r.created_at DESC
                LIMIT $4 OFFSET $5
            `;

            const result = await client.query(nearbyQuery, [
                parseFloat(latitude),
                parseFloat(longitude),
                parseFloat(radius),
                parseInt(limit),
                parseInt(offset)
            ]);

            // Map reports to camelCase
            const mappedReports = result.rows.map(report => ({
                id: report.id,
                userId: report.user_id,
                userName: report.user_name,
                title: report.title,
                description: report.description,
                category: report.category,
                priority: report.priority,
                mediaUrls: report.media_urls,
                audioUrl: report.audio_url,
                latitude: report.latitude,
                longitude: report.longitude,
                address: report.address,
                department: report.department,
                isResolved: report.is_resolved,
                createdAt: report.created_at,
                resolvedAt: report.resolved_at,
                distance: parseFloat(report.distance).toFixed(2)
            }));

            console.log(`✅ Found ${mappedReports.length} nearby reports`);

            res.status(200).json({
                success: true,
                reports: mappedReports,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    radius: parseFloat(radius)
                }
            });

        } finally {
            client.end();
        }

    } catch (error) {
        console.error('❌ Error fetching nearby reports:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching nearby reports',
            error: error.message
        });
    }
};

// Get reports statistics for a user
const getUserReportsStats = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        console.log('📊 Fetching report statistics for user:', userId);

        const client = await dbConnect();

        try {
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_reports,
                    COUNT(CASE WHEN is_resolved = true THEN 1 END) as resolved_reports,
                    COUNT(CASE WHEN is_resolved = false THEN 1 END) as pending_reports,
                    COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_reports,
                    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_reports,
                    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as reports_last_30_days,
                    AVG(CASE WHEN is_resolved = true THEN 
                        EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 
                    END) as avg_resolution_time_hours
                FROM reports 
                WHERE user_id = $1
            `;

            const result = await client.query(statsQuery, [userId]);
            const stats = result.rows[0];

            const mappedStats = {
                totalReports: parseInt(stats.total_reports),
                resolvedReports: parseInt(stats.resolved_reports),
                pendingReports: parseInt(stats.pending_reports),
                criticalReports: parseInt(stats.critical_reports),
                highPriorityReports: parseInt(stats.high_priority_reports),
                reportsLast30Days: parseInt(stats.reports_last_30_days),
                avgResolutionTimeHours: stats.avg_resolution_time_hours ? 
                    parseFloat(stats.avg_resolution_time_hours).toFixed(2) : null
            };

            console.log('✅ Statistics fetched successfully');

            res.status(200).json({
                success: true,
                stats: mappedStats
            });

        } finally {
            client.end();
        }

    } catch (error) {
        console.error('❌ Error fetching report statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching statistics',
            error: error.message
        });
    }
};

// Upload multiple media files for reports
const uploadReportMedia = async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        console.log('📁 Uploading report media for user:', userId);
        console.log('📄 Files received:', {
            mediaFiles: req.files?.mediaFiles?.length || 0,
            audioFile: req.files?.audioFile?.length || 0
        });

        const uploadedUrls = {
            mediaUrls: [],
            audioUrl: null
        };

        // Upload media files (images/videos)
        if (req.files?.mediaFiles) {
            console.log('📸 Uploading media files...');
            for (const mediaFile of req.files.mediaFiles) {
                try {
                    const cloudinaryResponse = await uploadOnCloudinary(mediaFile.path);
                    if (cloudinaryResponse) {
                        uploadedUrls.mediaUrls.push(cloudinaryResponse.secure_url);
                        console.log('✅ Media file uploaded:', cloudinaryResponse.secure_url);
                    } else {
                        console.error('❌ Failed to upload media file:', mediaFile.originalname);
                    }
                } catch (uploadError) {
                    console.error('❌ Error uploading media file:', uploadError);
                }
            }
        }

        // Upload audio file
        if (req.files?.audioFile && req.files.audioFile[0]) {
            console.log('🎤 Uploading audio file...');
            try {
                const audioFile = req.files.audioFile[0];
                const cloudinaryResponse = await uploadOnCloudinary(audioFile.path);
                if (cloudinaryResponse) {
                    uploadedUrls.audioUrl = cloudinaryResponse.secure_url;
                    console.log('✅ Audio file uploaded:', cloudinaryResponse.secure_url);
                } else {
                    console.error('❌ Failed to upload audio file');
                }
            } catch (uploadError) {
                console.error('❌ Error uploading audio file:', uploadError);
            }
        }

        console.log('📋 Upload summary:', uploadedUrls);

        res.status(200).json({
            success: true,
            message: 'Media files uploaded successfully',
            mediaUrls: uploadedUrls.mediaUrls,
            audioUrl: uploadedUrls.audioUrl
        });

    } catch (error) {
        console.error('❌ Error uploading report media:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while uploading media',
            error: error.message
        });
    }
};

// Upload single media file
const uploadSingleMedia = async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        console.log('📁 Uploading single media for user:', userId);
        console.log('📄 File:', req.file.originalname);

        const cloudinaryResponse = await uploadOnCloudinary(req.file.path);
        
        if (!cloudinaryResponse) {
            return res.status(500).json({
                success: false,
                message: 'Failed to upload file to cloud storage'
            });
        }

        console.log('✅ File uploaded successfully:', cloudinaryResponse.secure_url);

        res.status(200).json({
            success: true,
            message: 'Media file uploaded successfully',
            mediaUrl: cloudinaryResponse.secure_url
        });

    } catch (error) {
        console.error('❌ Error uploading single media:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while uploading media',
            error: error.message
        });
    }
};

export {
    createReport,
    getUserReports,
    getReportById,
    updateReport,
    resolveReport,
    deleteReport,
    getNearbyReports,
    getUserReportsStats,
    uploadReportMedia,
    uploadSingleMedia
};