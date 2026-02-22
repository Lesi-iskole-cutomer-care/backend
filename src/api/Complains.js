import express from "express";
import {
  createComplaint,
  getAllComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  complaintByFilter,
  getFullTotalComapins,
  getFullTodayComapins,
  getAvailableStatuses,
  getStatusSummary,
  getTodayComplaintsByUser,
  getAllComplaintsByUser,
  getAllReportUserId,
  getGUserFullId,
  getAllCountByuserId,
  getAllTodayComplainStatusByPendingUserId,
  getComplaintCountStatuswiseByUserId,
  updateComplaintStatusById,
  deleteComplaintById,
  getAgentsPointsSummary,
  getSingleAgentPointsSummary,
  // ✅ NEW
  FiltercomplainPointsByMonthlyAgentId,
} from "../application/Complains.js";

const router = express.Router();

// CREATE
router.post("/", createComplaint);

// 📊 Old endpoints (all-time + today)
router.get("/FullTotalComapins", getFullTotalComapins);
router.get("/FullTodayComapins", getFullTodayComapins);

// 📊 NEW: for dropdown + chart
router.get("/available-status", getAvailableStatuses);
router.get("/status-summary", getStatusSummary);

// 🔹 TODAY complaints for a given user (login user, all statuses)
router.get("/today-by-user", getTodayComplaintsByUser);

// 🔹 TODAY complaints for a given user with Pending status only
router.get(
  "/getAllTodayComplainStatusByPendingUserId",
  getAllTodayComplainStatusByPendingUserId
);

// 🔹 FULL complaints for a given user
router.get("/by-user", getAllComplaintsByUser);

// 🔹 Aliases
router.get("/getAllReportUserId", getAllReportUserId);
router.get("/getGUserFullId", getGUserFullId);

// 🔹 USER-WISE COUNTS (OLD SHAPE – all time)
router.get("/getAllCountByuserId", getAllCountByuserId);

// 🔹 USER-WISE COUNTS (NEW SHAPE, DATE RANGE)
router.get(
  "/getcomplaintcountstatuswiseByUserId",
  getComplaintCountStatuswiseByUserId
);

// ✅ STATUS UPDATE WITH POINTS + HISTORY + LEDGER
router.patch("/updateStatuscomplainById/:id", updateComplaintStatusById);

// ✅ MONTHLY POINTS (DEFAULT CURRENT MONTH)
router.get("/points/monthly", FiltercomplainPointsByMonthlyAgentId);

// ✅ DELETE BY ID (named endpoint)
router.delete("/deletecomplainById/:id", deleteComplaintById);

// 🔎 FILTER ENDPOINT (with count)
router.get("/filter", complaintByFilter);

// ✅ Dedicated update route (full update)
router.put("/update/:id", updateComplaint);

// Basic CRUD (legacy)
router.get("/", getAllComplaints);
router.get("/:id", getComplaintById);
router.delete("/:id", deleteComplaint);

router.get("/points/agents-summary", getAgentsPointsSummary);
router.get("/points/agent-summary/:agentId", getSingleAgentPointsSummary);


export default router;
