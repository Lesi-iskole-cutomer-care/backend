// src/application/Complains.js
import mongoose from "mongoose";
import Complaint from "../infastructure/schemas/Complains.js";
import AgentPointLedger from "../infastructure/schemas/AgentPointLedger.js";
import User from "../infastructure/schemas/User.js";


/* ---------------------------------------------------
 * 🔢 Helper: Generate InvoiceNumber like "LesiCC202511110319001"
 * --------------------------------------------------- */
const generateInvoiceNumber = async () => {
  const now = new Date();

  const pad = (n, size = 2) => String(n).padStart(size, "0");

  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hour = pad(now.getHours());
  const minute = pad(now.getMinutes());

  const base = `${year}${month}${day}${hour}${minute}`;
  const prefix = "LesiCC";

  const lastInvoice = await Complaint.findOne({
    InvoiceNumber: { $regex: `^${prefix}${base}` },
  })
    .sort({ InvoiceNumber: -1 })
    .lean();

  let seq = 1;
  if (lastInvoice && lastInvoice.InvoiceNumber) {
    const match = lastInvoice.InvoiceNumber.match(/(\d{3})$/);
    if (match) seq = parseInt(match[1], 10) + 1;
  }

  const seqStr = String(seq).padStart(3, "0");
  return `${prefix}${base}${seqStr}`;
};

/* ---------------------------------------------------
 * 🧠 Filter builder
 * --------------------------------------------------- */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildFilterFromQuery = (query) => {
  const {
    status,

    mainProblem,
    problem,
    subProblem,

    agent,
    responsiblePerson,
    responsibleBy,

    department,

    fromDate,
    toDate,

    userId,
    createdBy,

    invoiceNumber,
    invoiceNo,
    invoice,
    contactNumber,
    mobileNumber,
    phone,
    customerName,
  } = query;

  const filter = {};

  if (status) filter.status = status;

  const mainProblemId = mainProblem || problem;
  if (mainProblemId && isValidObjectId(mainProblemId)) {
    filter.mainProblem = mainProblemId;
  }

  if (subProblem && isValidObjectId(subProblem)) {
    filter.subProblem = subProblem;
  }

  if (department && isValidObjectId(department)) {
    filter.ResponsibleDepartment = department;
  }

  const responsibleId = responsibleBy || responsiblePerson;
  if (responsibleId && isValidObjectId(responsibleId)) {
    filter.responsiblePerson = responsibleId;
  }

  const creatorFromQuery = createdBy || userId;
  if (agent && isValidObjectId(agent)) {
    filter.createdBy = agent;
  } else if (creatorFromQuery && isValidObjectId(creatorFromQuery)) {
    filter.createdBy = creatorFromQuery;
  }

  const inv = invoiceNumber || invoiceNo || invoice;
  if (inv) filter.InvoiceNumber = inv;

  const phoneVal = contactNumber || mobileNumber || phone;
  if (phoneVal) filter.ContactNumber = phoneVal;

  if (customerName) {
    filter.CustomerName = { $regex: customerName, $options: "i" };
  }

  if (fromDate || toDate) {
    filter.createdAt = {};

    if (fromDate) {
      const from = new Date(fromDate);
      if (!isNaN(from.getTime())) {
        from.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = from;
      }
    }

    if (toDate) {
      const to = new Date(toDate);
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }
  }

  return filter;
};

/* ---------------------------------------------------
 * ✅ POINT SYSTEM HELPERS
 * --------------------------------------------------- */
const NEXT_STATUS = {
  Pending: "Processing",
  Processing: "Solved",
  Solved: "Informed",
  Informed: null,
};

const getMonthKey = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
};

const diffMin = (a, b) => {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
};

const countWords = (text) => {
  const t = String(text || "").trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
};

const scorePendingToProcessing = (m) => {
  if (m <= 10) return 5;
  if (m <= 60) return 4;
  if (m <= 180) return 3;
  if (m <= 720) return 2;
  if (m <= 1440) return 1;
  return 1;
};

const scoreProcessingToSolved = (m) => {
  if (m <= 60) return 4;
  if (m <= 300) return 5; // <=5 hours best
  if (m <= 480) return 3;
  if (m <= 720) return 2;
  return 1;
};

const scoreSolvedToInformed = (m) => {
  if (m <= 60) return 4;
  if (m <= 360) return 5; // <=6 hours best
  if (m <= 720) return 4;
  if (m <= 1440) return 3;
  return 1;
};

const calcTimePoints = ({ fromStatus, toStatus, minutesTaken }) => {
  if (fromStatus === "Pending" && toStatus === "Processing")
    return scorePendingToProcessing(minutesTaken);
  if (fromStatus === "Processing" && toStatus === "Solved")
    return scoreProcessingToSolved(minutesTaken);
  if (fromStatus === "Solved" && toStatus === "Informed")
    return scoreSolvedToInformed(minutesTaken);
  return 1;
};

const calcNotePoints = (note) => {
  const words = countWords(note);
  if (words <= 4) return { notePoints: 1, noteWords: words };
  if (words <= 7) return { notePoints: 2, noteWords: words };
  if (words <= 12) return { notePoints: 3, noteWords: words };
  if (words <= 20) return { notePoints: 4, noteWords: words };
  return { notePoints: 5, noteWords: words };
};

const calcTotalPoints = ({ toStatus, timePoints, notePoints }) => {
  if (toStatus !== "Informed") return Math.max(0, Math.min(5, timePoints));
  const combined = Math.round(timePoints * 0.7 + notePoints * 0.3);
  return Math.max(0, Math.min(5, combined));
};

/* ---------------------------------------------------
 * ✅ Create Complaint
 * --------------------------------------------------- */
export const createComplaint = async (req, res) => {
  try {
    const {
      CustomerName,
      ContactNumber,
      mainProblem,
      subProblem,
      ResponsibleDepartment,
      responsiblePerson,
      description,
      createdBy,
      complaintNote,
    } = req.body;

    if (
      !ContactNumber ||
      !mainProblem ||
      !subProblem ||
      !ResponsibleDepartment ||
      !responsiblePerson ||
      !description ||
      !createdBy
    ) {
      return res.status(400).json({
        message:
          "ContactNumber, mainProblem, subProblem, ResponsibleDepartment, responsiblePerson, description, and createdBy are required",
      });
    }

    const InvoiceNumber = await generateInvoiceNumber();

    const complaint = new Complaint({
      InvoiceNumber,
      CustomerName,
      ContactNumber,
      mainProblem,
      subProblem,
      ResponsibleDepartment,
      responsiblePerson,
      description,
      createdBy,
      complaintNote: complaintNote || "",
      status: "Pending",
      statusChangedAt: new Date(),
    });

    await complaint.save();

    return res.status(201).json({
      message: "Complaint created successfully",
      complaint,
    });
  } catch (err) {
    console.error("createComplaint error:", err);
    if (err.code === 11000 && err.keyPattern?.InvoiceNumber) {
      return res
        .status(409)
        .json({ message: "A complaint with this InvoiceNumber already exists" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ Get ALL Complaints
 * --------------------------------------------------- */
export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("mainProblem", "name")
      .populate("subProblem", "name")
      .populate("ResponsibleDepartment", "name")
      .populate("responsiblePerson", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ complaints });
  } catch (err) {
    console.error("getAllComplaints error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ Get Complaint by id
 * --------------------------------------------------- */
export const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findById(id)
      .populate("mainProblem", "name")
      .populate("subProblem", "name")
      .populate("ResponsibleDepartment", "name")
      .populate("responsiblePerson", "name")
      .populate("createdBy", "name");

    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    return res.status(200).json({ complaint });
  } catch (err) {
    console.error("getComplaintById error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ FILTER with count  (THIS FIXES YOUR CRASH)
 * --------------------------------------------------- */
export const complaintByFilter = async (req, res) => {
  try {
    const filter = buildFilterFromQuery(req.query);

    const complaints = await Complaint.find(filter)
      .populate("mainProblem", "name")
      .populate("subProblem", "name")
      .populate("ResponsibleDepartment", "name")
      .populate("responsiblePerson", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: complaints.length,
      complaints,
    });
  } catch (err) {
    console.error("complaintByFilter error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ Update Complaint (full update - legacy)
 * --------------------------------------------------- */
export const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "Complaint id is required" });

    const {
      CustomerName,
      ContactNumber,
      mainProblem,
      subProblem,
      ResponsibleDepartment,
      responsiblePerson,
      description,
      status,
      complaintNote,
    } = req.body;

    const allowedStatus = ["Pending", "Processing", "Solved", "Informed"];
    const updateData = {};

    if (CustomerName !== undefined) updateData.CustomerName = CustomerName;
    if (ContactNumber !== undefined) updateData.ContactNumber = ContactNumber;
    if (mainProblem) updateData.mainProblem = mainProblem;
    if (subProblem) updateData.subProblem = subProblem;
    if (ResponsibleDepartment) updateData.ResponsibleDepartment = ResponsibleDepartment;
    if (responsiblePerson) updateData.responsiblePerson = responsiblePerson;
    if (description !== undefined) updateData.description = description;
    if (complaintNote !== undefined) updateData.complaintNote = complaintNote;

    if (status !== undefined && status !== "") {
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid fields provided to update" });
    }

    const updatedComplaint = await Complaint.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("mainProblem", "name")
      .populate("subProblem", "name")
      .populate("ResponsibleDepartment", "name")
      .populate("responsiblePerson", "name")
      .populate("createdBy", "name");

    if (!updatedComplaint) return res.status(404).json({ message: "Complaint not found" });

    return res.status(200).json({
      message: "Complaint updated successfully",
      complaint: updatedComplaint,
    });
  } catch (err) {
    console.error("🔥 [updateComplaint] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ Delete Complaint (generic /:id)
 * --------------------------------------------------- */
export const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedComplaint = await Complaint.findByIdAndDelete(id);
    if (!deletedComplaint) return res.status(404).json({ message: "Complaint not found" });

    return res.status(200).json({
      message: "Complaint deleted successfully",
      complaint: deletedComplaint,
    });
  } catch (err) {
    console.error("deleteComplaint error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ Delete Complaint by ID (named endpoint)
 * --------------------------------------------------- */
export const deleteComplaintById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "Complaint id is required" });

    const deletedComplaint = await Complaint.findByIdAndDelete(id);
    if (!deletedComplaint) return res.status(404).json({ message: "Complaint not found" });

    return res.status(200).json({
      message: "Complaint deleted successfully",
      complaint: deletedComplaint,
    });
  } catch (err) {
    console.error("🔥 [deleteComplaintById] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ ALL-TIME STATUS COUNTS
 * --------------------------------------------------- */
export const getFullTotalComapins = async (req, res) => {
  try {
    const grouped = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result = {
      totalCount: 0,
      pendingCount: 0,
      processingCount: 0,
      solvedCount: 0,
      informedCount: 0,
    };

    grouped.forEach((g) => {
      if (g._id === "Pending") result.pendingCount = g.count;
      if (g._id === "Processing") result.processingCount = g.count;
      if (g._id === "Solved") result.solvedCount = g.count;
      if (g._id === "Informed") result.informedCount = g.count;
      result.totalCount += g.count;
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("getFullTotalComapins error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ TODAY STATUS COUNTS
 * --------------------------------------------------- */
export const getFullTodayComapins = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const groupedToday = await Complaint.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result = {
      dateStartISO: start.toISOString(),
      dateEndISO: end.toISOString(),
      totalCount: 0,
      pendingCount: 0,
      processingCount: 0,
      solvedCount: 0,
      informedCount: 0,
    };

    groupedToday.forEach((g) => {
      if (g._id === "Pending") result.pendingCount = g.count;
      if (g._id === "Processing") result.processingCount = g.count;
      if (g._id === "Solved") result.solvedCount = g.count;
      if (g._id === "Informed") result.informedCount = g.count;
      result.totalCount += g.count;
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("getFullTodayComapins error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ Available statuses
 * --------------------------------------------------- */
export const getAvailableStatuses = async (req, res) => {
  try {
    const statuses = await Complaint.distinct("status");
    return res.status(200).json({ statuses });
  } catch (err) {
    console.error("getAvailableStatuses error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ Status summary (today / filter)
 * --------------------------------------------------- */
export const getStatusSummary = async (req, res) => {
  try {
    const query = { ...req.query };

    if (!query.fromDate && !query.toDate) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      query.fromDate = dateStr;
      query.toDate = dateStr;
    }

    const filter = buildFilterFromQuery(query);

    const grouped = await Complaint.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    let totalCount = 0;
    const byStatus = grouped.map((g) => {
      totalCount += g.count;
      return { status: g._id, count: g.count };
    });

    return res.status(200).json({ totalCount, byStatus });
  } catch (err) {
    console.error("getStatusSummary error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ TODAY complaints for user (ALL)
 * --------------------------------------------------- */
export const getTodayComplaintsByUser = async (req, res) => {
  try {
    const { userId, createdBy } = req.query;
    const creator = createdBy || userId;

    if (!creator) return res.status(400).json({ message: "userId (createdBy) is required" });

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const complaints = await Complaint.find({
      createdBy: creator,
      createdAt: { $gte: start, $lte: end },
    })
      .populate("mainProblem", "name")
      .populate("subProblem", "name")
      .populate("ResponsibleDepartment", "name")
      .populate("responsiblePerson", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: complaints.length, complaints });
  } catch (err) {
    console.error("getTodayComplaintsByUser error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ TODAY complaints for user WITH Pending only
 * --------------------------------------------------- */
export const getAllTodayComplainStatusByPendingUserId = async (req, res) => {
  try {
    const { userId, createdBy } = req.query;
    const creator = createdBy || userId;

    if (!creator) return res.status(400).json({ message: "userId (createdBy) is required" });

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const complaints = await Complaint.find({
      createdBy: creator,
      status: "Pending",
      createdAt: { $gte: start, $lte: end },
    })
      .populate("mainProblem", "name")
      .populate("subProblem", "name")
      .populate("ResponsibleDepartment", "name")
      .populate("responsiblePerson", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      userId: creator,
      status: "Pending",
      dateStartISO: start.toISOString(),
      dateEndISO: end.toISOString(),
      count: complaints.length,
      complaints,
    });
  } catch (err) {
    console.error("getAllTodayComplainStatusByPendingUserId error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ FULL complaints for a user
 * --------------------------------------------------- */
export const getAllComplaintsByUser = async (req, res) => {
  try {
    const { userId, createdBy } = req.query;
    const creator = createdBy || userId;

    if (!creator) return res.status(400).json({ message: "userId (createdBy) is required" });

    const complaints = await Complaint.find({ createdBy: creator })
      .populate("mainProblem", "name")
      .populate("subProblem", "name")
      .populate("ResponsibleDepartment", "name")
      .populate("responsiblePerson", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: complaints.length, complaints });
  } catch (err) {
    console.error("getAllComplaintsByUser error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ Aliases
 * --------------------------------------------------- */
export const getAllReportUserId = (req, res) => getAllComplaintsByUser(req, res);
export const getGUserFullId = (req, res) => getAllComplaintsByUser(req, res);

/* ---------------------------------------------------
 * ✅ User-wise counts (OLD SHAPE)
 * --------------------------------------------------- */
export const getAllCountByuserId = async (req, res) => {
  try {
    const { userId, createdBy } = req.query;
    const creator = createdBy || userId;

    if (!creator) return res.status(400).json({ message: "userId (createdBy) is required" });

    const grouped = await Complaint.aggregate([
      { $match: { createdBy: creator } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result = {
      userId: creator,
      totalCount: 0,
      pendingCount: 0,
      processingCount: 0,
      solvedCount: 0,
      informedCount: 0,
    };

    grouped.forEach((g) => {
      if (g._id === "Pending") result.pendingCount = g.count;
      if (g._id === "Processing") result.processingCount = g.count;
      if (g._id === "Solved") result.solvedCount = g.count;
      if (g._id === "Informed") result.informedCount = g.count;
      result.totalCount += g.count;
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("getAllCountByuserId error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ Status-wise counts by UserId (NEW) with date range
 * --------------------------------------------------- */
export const getComplaintCountStatuswiseByUserId = async (req, res) => {
  try {
    const { userId, createdBy, fromDate, toDate } = req.query;
    const creator = createdBy || userId;

    if (!creator) return res.status(400).json({ message: "userId (createdBy) is required" });

    let start;
    let end;

    if (fromDate && toDate) {
      start = new Date(fromDate);
      end = new Date(toDate);
    } else if (fromDate && !toDate) {
      start = new Date(fromDate);
      end = new Date(fromDate);
    } else if (!fromDate && toDate) {
      start = new Date(toDate);
      end = new Date(toDate);
    } else {
      const today = new Date();
      start = new Date(today);
      end = new Date(today);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const complaints = await Complaint.find({
      createdBy: creator,
      createdAt: { $gte: start, $lte: end },
    }).select("status createdBy createdAt");

    let total = 0;
    let pending = 0;
    let processing = 0;
    let solved = 0;
    let informed = 0;

    complaints.forEach((c) => {
      total += 1;
      if (c.status === "Pending") pending += 1;
      if (c.status === "Processing") processing += 1;
      if (c.status === "Solved") solved += 1;
      if (c.status === "Informed") informed += 1;
    });

    return res.status(200).json({
      userId: creator,
      dateStartISO: start.toISOString(),
      dateEndISO: end.toISOString(),
      total,
      pending,
      processing,
      solved,
      informed,
    });
  } catch (err) {
    console.error("getComplaintCountStatuswiseByUserId error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ STATUS UPDATE by ID (WITH HISTORY)
 * ✅ Ledger inserts ONLY when status becomes "Informed"
 * PATCH /api/complaints/updateStatuscomplainById/:id
 * --------------------------------------------------- */
export const updateComplaintStatusById = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, complaintNote, changedBy } = req.body;

    if (!id) return res.status(400).json({ message: "Complaint id is required" });
    if (!status) return res.status(400).json({ message: "Status is required" });

    const allowedStatus = ["Pending", "Processing", "Solved", "Informed"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // ✅ required who changed
    if (!changedBy || !mongoose.Types.ObjectId.isValid(changedBy)) {
      return res.status(400).json({ message: "changedBy (valid userId) is required" });
    }

    const existing = await Complaint.findById(id).select(
      "status statusChangedAt complaintNote createdBy createdAt"
    );

    if (!existing) return res.status(404).json({ message: "Complaint not found" });

    const fromStatus = existing.status || "Pending";
    const expectedNext = NEXT_STATUS[fromStatus];

    if (!expectedNext) {
      return res.status(400).json({
        message: "This complaint is already Informed. No further steps allowed.",
      });
    }

    if (status !== expectedNext) {
      return res.status(400).json({
        message: `Invalid step. Current: ${fromStatus}. Next allowed: ${expectedNext}`,
      });
    }

    if (status === "Informed") {
      const words = countWords(complaintNote);
      if (words < 3) {
        return res.status(400).json({
          message: "complaintNote must have at least 3 words when status is Informed",
        });
      }
    }

    const now = new Date();
    const lastChange = existing.statusChangedAt || existing.createdAt || now;
    const minutesTaken = diffMin(lastChange, now);

    const timePoints = calcTimePoints({ fromStatus, toStatus: status, minutesTaken });

    let notePoints = 0;
    let noteWords = 0;

    if (status === "Informed") {
      const np = calcNotePoints(complaintNote);
      notePoints = np.notePoints;
      noteWords = np.noteWords;
    }

    const totalPoints = calcTotalPoints({ toStatus: status, timePoints, notePoints });

    const setData = { status, statusChangedAt: now };

    if (complaintNote !== undefined) setData.complaintNote = complaintNote;
    if (status === "Processing") setData.processingAt = now;
    if (status === "Solved") setData.solvedAt = now;
    if (status === "Informed") setData.informedAt = now;

    const historyRecord = {
      from: fromStatus,
      to: status,
      changedAt: now,
      changedBy,
      minutesTaken,
      timePoints,
      notePoints,
      totalPoints,
      noteWords,
    };

    const updatedComplaint = await Complaint.findByIdAndUpdate(
      id,
      { $set: setData, $push: { statusHistory: historyRecord } },
      { new: true, runValidators: true }
    )
      .populate("mainProblem", "name")
      .populate("subProblem", "name")
      .populate("ResponsibleDepartment", "name")
      .populate("responsiblePerson", "name")
      .populate("createdBy", "name");

    // ✅ Ledger insert ONLY for Informed
    if (status === "Informed") {
      const monthKey = getMonthKey(now);

      await AgentPointLedger.create({
        agentId: changedBy, // ✅ points for agent who finished it
        complaintId: existing._id,
        fromStatus,
        toStatus: status,
        minutesTaken,
        timePoints,
        notePoints,
        totalPoints,
        noteWords,
        monthKey,
        changedAt: now,
      });

      return res.status(200).json({
        message: "Status updated successfully",
        complaint: updatedComplaint,
        points: { monthKey, minutesTaken, timePoints, notePoints, totalPoints, noteWords },
      });
    }

    return res.status(200).json({
      message: "Status updated successfully",
      complaint: updatedComplaint,
      points: null,
    });
  } catch (err) {
    console.error("🔥 [updateComplaintStatusById] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------------------------------------------
 * ✅ MONTHLY POINTS (DEFAULT CURRENT MONTH)
 * ✅ Counts ONLY ledger rows (which exist only for Informed)
 * GET /api/complaints/points/monthly?agentId=xxxx&monthKey=YYYY-MM(optional)
 * --------------------------------------------------- */
export const FiltercomplainPointsByMonthlyAgentId = async (req, res) => {
  try {
    const { agentId, monthKey } = req.query;

    if (!agentId) return res.status(400).json({ message: "agentId is required" });

    const mk =
      monthKey && String(monthKey).trim()
        ? String(monthKey).trim()
        : getMonthKey(new Date());

    const data = await AgentPointLedger.aggregate([
      { $match: { agentId: new mongoose.Types.ObjectId(agentId), monthKey: mk } },
      {
        $group: {
          _id: "$monthKey",
          totalPoints: { $sum: "$totalPoints" },
          informedCount: { $sum: 1 }, // each ledger row == one informed complaint
          avgMinutes: { $avg: "$minutesTaken" },
        },
      },
    ]);

    const row = data[0] || null;

    return res.status(200).json({
      agentId,
      month: mk,
      points: row ? Math.round((row.totalPoints || 0) * 100) / 100 : 0,
      transitions: row ? row.informedCount : 0, // keep frontend key
      avgMinutes: row ? Math.round((row.avgMinutes || 0) * 100) / 100 : 0,
    });
  } catch (err) {
    console.error("FiltercomplainPointsByMonthlyAgentId error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


const getMonthKeyNow = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
};

/**
 * ✅ GET /api/complaints/points/agents-summary?monthKey=YYYY-MM(optional)
 * Returns: [{ agentId, name, phonenumber, role, totalPointsAllTime, monthPoints, monthTransitions, monthAvgMinutes, monthKey }]
 */
export const getAgentsPointsSummary = async (req, res) => {
  try {
    const mk =
      req.query.monthKey && String(req.query.monthKey).trim()
        ? String(req.query.monthKey).trim()
        : getMonthKeyNow(new Date());

    // 1) Load all agents from Users (agent role based)
    // Adjust roles if your system uses "agent" only or includes "admin"
    const agents = await User.find({ role: { $in: ["agent", "Agent"] } })
      .select("_id name phonenumber role")
      .lean();

    // 2) Total points all time by agent
    const totalsAllTime = await AgentPointLedger.aggregate([
      {
        $group: {
          _id: "$agentId",
          totalPointsAllTime: { $sum: "$totalPoints" },
        },
      },
    ]);

    const totalMap = new Map(
      totalsAllTime.map((r) => [
        String(r._id),
        Math.round((r.totalPointsAllTime || 0) * 100) / 100,
      ])
    );

    // 3) This month points by agent
    const totalsThisMonth = await AgentPointLedger.aggregate([
      { $match: { monthKey: mk } },
      {
        $group: {
          _id: "$agentId",
          monthPoints: { $sum: "$totalPoints" },
          monthTransitions: { $sum: 1 },
          monthAvgMinutes: { $avg: "$minutesTaken" },
        },
      },
    ]);

    const monthMap = new Map(
      totalsThisMonth.map((r) => [
        String(r._id),
        {
          monthPoints: Math.round((r.monthPoints || 0) * 100) / 100,
          monthTransitions: r.monthTransitions || 0,
          monthAvgMinutes: Math.round((r.monthAvgMinutes || 0) * 100) / 100,
        },
      ])
    );

    // 4) Merge for response (include agents even with 0 points)
    const rows = agents.map((a) => {
      const agentId = String(a._id);
      const month = monthMap.get(agentId) || {
        monthPoints: 0,
        monthTransitions: 0,
        monthAvgMinutes: 0,
      };

      return {
        agentId,
        name: a.name || "",
        phonenumber: a.phonenumber || "",
        role: a.role || "",
        totalPointsAllTime: totalMap.get(agentId) || 0,
        monthKey: mk,
        monthPoints: month.monthPoints,
        monthTransitions: month.monthTransitions,
        monthAvgMinutes: month.monthAvgMinutes,
      };
    });

    return res.status(200).json({
      monthKey: mk,
      count: rows.length,
      agents: rows,
    });
  } catch (err) {
    console.error("🔥 [getAgentsPointsSummary] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * ✅ GET /api/complaints/points/agent-summary/:agentId?monthKey=YYYY-MM(optional)
 * For single agent summary
 */
export const getSingleAgentPointsSummary = async (req, res) => {
  try {
    const { agentId } = req.params;

    if (!agentId || !mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ message: "Valid agentId is required" });
    }

    const mk =
      req.query.monthKey && String(req.query.monthKey).trim()
        ? String(req.query.monthKey).trim()
        : getMonthKeyNow(new Date());

    const agent = await User.findById(agentId).select("_id name phonenumber role").lean();
    if (!agent) return res.status(404).json({ message: "Agent not found" });

    const [allTimeRow] = await AgentPointLedger.aggregate([
      { $match: { agentId: new mongoose.Types.ObjectId(agentId) } },
      { $group: { _id: "$agentId", totalPointsAllTime: { $sum: "$totalPoints" } } },
    ]);

    const [monthRow] = await AgentPointLedger.aggregate([
      {
        $match: {
          agentId: new mongoose.Types.ObjectId(agentId),
          monthKey: mk,
        },
      },
      {
        $group: {
          _id: "$agentId",
          monthPoints: { $sum: "$totalPoints" },
          monthTransitions: { $sum: 1 },
          monthAvgMinutes: { $avg: "$minutesTaken" },
        },
      },
    ]);

    return res.status(200).json({
      agentId: String(agent._id),
      name: agent.name || "",
      phonenumber: agent.phonenumber || "",
      role: agent.role || "",
      monthKey: mk,
      totalPointsAllTime: Math.round(((allTimeRow?.totalPointsAllTime || 0) * 100)) / 100,
      monthPoints: Math.round(((monthRow?.monthPoints || 0) * 100)) / 100,
      monthTransitions: monthRow?.monthTransitions || 0,
      monthAvgMinutes: Math.round(((monthRow?.monthAvgMinutes || 0) * 100)) / 100,
    });
  } catch (err) {
    console.error("🔥 [getSingleAgentPointsSummary] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};