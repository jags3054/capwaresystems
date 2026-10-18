const express = require("express");
const mongoose = require("mongoose");

const requireAdmin = require("../middelware/requireAdmin");

const Service = require("../models/Service");
const InternshipProgram = require("../models/InternshipProgram");
const Project = require("../models/Project");
const Enquiry = require("../models/Enquiry");
const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const Contact = require("../models/Contact");
const ResearchEnquiry = require("../models/ResearchEnquiry");
const authMiddleware = require("../middelware/authMiddleware");
const router = express.Router();

router.use(requireAdmin);

const resources = {
  services: {
    model: Service,
    fields: ["title", "description", "price", "status"],
  },
  internships: {
    model: InternshipProgram,
    fields: ["title", "description", "duration", "fee", "mode", "status"],
  },
  projects: {
    model: Project,
    fields: ["title", "description", "technology", "price", "status"],
  },
};

function safePayload(input, fields) {
  const result = {};
  for (const key of fields) {
    if (input[key] !== undefined) result[key] = input[key];
  }
  return result;
}

const PAID_STATUSES = ["PAID", "COMPLETED", "SUCCESS", "SUCCEEDED"];

async function getRevenueByType(type) {
  const result = await Enrollment.aggregate([
    {
      $match: {
        type,
        paymentStatus: {
          $in: PAID_STATUSES,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: {
          $sum: {
            $convert: {
              input: "$amount",
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
        },
        paidEnrollments: { $sum: 1 },
      },
    },
  ]);

  return {
    revenue: result[0]?.totalRevenue || 0,
    paidEnrollments: result[0]?.paidEnrollments || 0,
  };
}
router.get("/dashboard", async (_req, res) => {
  try {
    // 1. Calculate paid revenue from Internship, Project, and Service enrollments
    const [
      internshipRevenue,
      projectRevenue,
      serviceRevenue,
    ] = await Promise.all([
      getRevenueByType("Internship"),
      getRevenueByType("Project"),
      getRevenueByType("Service"),
    ]);

    // 2. Calculate Research Collection from successful payments
    const researchCollectionResult = await ResearchEnquiry.aggregate([
      {
        $match: {
          paymentStatus: "PAID",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $convert: {
                input: "$amount",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
        },
      },
    ]);

    const researchCollection =
      researchCollectionResult[0]?.total || 0;

    // 3. Calculate TOTAL revenue including Research Collection
    const totalRevenue =
      internshipRevenue.revenue +
      projectRevenue.revenue +
      serviceRevenue.revenue +
      researchCollection;

    // 4. Fetch dashboard counts and recent records
    const [
      totalUsers,
      totalServices,
      totalInternshipPrograms,
      totalProjects,
      totalLeads,
      totalInternshipEnrollments,
      totalProjectEnrollments,
      totalServiceEnrollments,
      totalResearchEnquiries,
      recentLeads,
      recentResearchEnquiries,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      Service.countDocuments(),
      InternshipProgram.countDocuments(),
      Project.countDocuments(),
      Contact.countDocuments(),
      Enrollment.countDocuments({ type: "Internship" }),
      Enrollment.countDocuments({ type: "Project" }),
      Enrollment.countDocuments({ type: "Service" }),
      ResearchEnquiry.countDocuments(),

      Contact.find()
        .sort({ submittedAt: -1 })
        .limit(6)
        .select(
          "name email mobile subject message submittedAt status"
        )
        .lean(),

      ResearchEnquiry.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select(
          "name email service domain topic status createdAt"
        )
        .lean(),
    ]);

    // 5. Send dashboard response
    return res.json({
      stats: {
        users: totalUsers,
        totalLeads,

        internships: totalInternshipPrograms,
        projects: totalProjects,
        services: totalServices,

        internshipEnrollments: totalInternshipEnrollments,
        projectEnrollments: totalProjectEnrollments,
        serviceEnrollments: totalServiceEnrollments,

        researchEnquiries: totalResearchEnquiries,

        // Individual revenue amounts
        internshipRevenue: internshipRevenue.revenue,
        projectRevenue: projectRevenue.revenue,
        serviceRevenue: serviceRevenue.revenue,
        researchCollection: researchCollection,

        // Combined revenue INCLUDING research
        revenue: totalRevenue,

        // Paid enrollment counts
        paidInternshipEnrollments:
          internshipRevenue.paidEnrollments,

        paidProjectEnrollments:
          projectRevenue.paidEnrollments,

        paidServiceEnrollments:
          serviceRevenue.paidEnrollments,
      },

      recentLeads: recentLeads.map((lead) => ({
        _id: String(lead._id),
        name: lead.name || "",
        email: lead.email || "",
        mobile: lead.mobile || "",
        subject: lead.subject || "",
        message: lead.message || "",
        status: lead.status || "New",
        source: "Website Contact Form",
        createdAt: lead.submittedAt || null,
      })),

      recentResearchEnquiries: recentResearchEnquiries.map(
        (item) => ({
          _id: String(item._id),
          name: item.name || "",
          email: item.email || "",
          service: item.service || "",
          domain: item.domain || "",
          topic: item.topic || "",
          status: item.status || "New",
          source: "Research & PhD Guidance",
          createdAt: item.createdAt || null,
        })
      ),
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    return res.status(500).json({
      message: "Unable to load dashboard.",
    });
  }
});
router.get("/enquiries", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 50)
    );

    const filter = {};
    if (["new", "contacted", "qualified", "closed"].includes(req.query.status))
      filter.status = req.query.status;

    if (req.query.q) {
      const q = String(req.query.q).trim().slice(0, 100);
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Enquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Enquiry.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: "Unable to load enquiries." });
  }
});

router.post("/enquiries", async (req, res) => {
  try {
    const { name, email, phone, interest, message, source, status, notes } =
      req.body || {};

    if (!name || !String(name).trim())
      return res.status(400).json({ message: "Name is required." });

    const item = await Enquiry.create({
      name,
      email,
      phone,
      interest,
      message,
      source,
      status,
      notes,
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: "Unable to create enquiry." });
  }
});

router.patch("/enquiries/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ message: "Invalid enquiry ID." });

  const allowed = ["status", "notes", "interest"];
  const payload = safePayload(req.body || {}, allowed);

  try {
    const item = await Enquiry.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!item) return res.status(404).json({ message: "Enquiry not found." });

    res.json(item);
  } catch (error) {
    res.status(400).json({ message: "Unable to update enquiry." });
  }
});

router.delete("/enquiries/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ message: "Invalid enquiry ID." });

  const item = await Enquiry.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Enquiry not found." });

  res.json({ message: "Enquiry deleted." });
});

for (const [path, config] of Object.entries(resources)) {
  router.get(`/${path}`, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim().slice(0, 100);
      const filter = q ? { title: { $regex: q, $options: "i" } } : {};

      const items = await config.model
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(200);

      res.json({ items });
    } catch (error) {
      res.status(500).json({ message: `Unable to load ${path}.` });
    }
  });

  router.post(`/${path}`, async (req, res) => {
    try {
      const payload = safePayload(req.body || {}, config.fields);

      if (!payload.title || !String(payload.title).trim())
        return res.status(400).json({ message: "Title is required." });

      const item = await config.model.create(payload);
      res.status(201).json(item);
    } catch (error) {
      res
        .status(400)
        .json({ message: `Unable to create ${path.slice(0, -1)}.` });
    }
  });


  router.patch(`/${path}/:id`, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid item ID." });

    try {
      const payload = safePayload(req.body || {}, config.fields);

      const item = await config.model.findByIdAndUpdate(
        req.params.id,
        payload,
        { new: true, runValidators: true }
      );

      if (!item) return res.status(404).json({ message: "Item not found." });

      res.json(item);
    } catch (error) {
      res
        .status(400)
        .json({ message: `Unable to update ${path.slice(0, -1)}.` });
    }
  });

  router.delete(`/${path}/:id`, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid item ID." });

    const item = await config.model.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found." });

    res.json({ message: "Item deleted." });
  });
}

router.get("/internships/registrations", async (_req, res) => {
  try {
    // The public registration flow creates a User record containing
    // selectedInternship, selectedPackage, packagePrice and payment status.
    const users = await User.find({
      role: { $ne: "admin" },
      selectedInternship: { $nin: ["", "Not enrolled"] },
    })
      .select(
        "name email mobile college course year selectedInternship selectedPackage packagePrice selectedProject paymentStatus enrollmentStatus createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const userIds = users.map((user) => user._id);

    const enrollments = await Enrollment.find({
      user: { $in: userIds },
      type: "Internship",
    })
      .select(
        "user itemId itemName selectedPackage project amount paymentStatus status createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    const latestEnrollmentByUser = new Map();
    for (const enrollment of enrollments) {
      const userId = String(enrollment.user);
      if (!latestEnrollmentByUser.has(userId)) {
        latestEnrollmentByUser.set(userId, enrollment);
      }
    }

    const items = users.map((user) => {
      const enrollment = latestEnrollmentByUser.get(String(user._id));
      return {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        college: user.college,
        course: user.course,
        year: user.year,
        selectedInternship: enrollment?.itemName || user.selectedInternship,
        selectedPackage: enrollment?.selectedPackage || user.selectedPackage,
        selectedProject: enrollment?.project || user.selectedProject || "",
        packagePrice: user.packagePrice,
        amount:
          enrollment?.amount !== undefined && enrollment?.amount !== null
            ? enrollment.amount
            : user.packagePrice ?? 0,
        paymentStatus:
          enrollment?.paymentStatus || user.paymentStatus || "PENDING",
        enrollmentStatus:
          enrollment?.status || user.enrollmentStatus || "PENDING_PAYMENT",
        createdAt: enrollment?.createdAt || user.createdAt,
      };
    });

    res.json({ items, total: items.length });
  } catch (error) {
    console.error("Admin internship registrations error:", error.message);
    res
      .status(500)
      .json({ message: "Unable to load student internship registrations." });
  }
});

router.get("/services/registrations", async (req, res) => {
  try {
    const filter = { type: "Service" };

    const [items, total] = await Promise.all([
      Enrollment.find(filter)
        .populate("user", "name email mobile phone college course year")
        .sort({ createdAt: -1 })
        .lean(),

      Enrollment.countDocuments(filter),
    ]);

    console.log("Service registrations fetched:", total);

    res.json({
      items,
      total,
      type: "Service",
    });
  } catch (error) {
    console.error("Admin service registrations error:", error);

    res.status(500).json({
      message: "Unable to load service registrations.",
    });
  }
});

router.get("/enquiries", async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 50)
    );

    const filter = {};

    if (req.query.q) {
      const q = String(req.query.q).trim().slice(0, 100);

      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { message: { $regex: q, $options: "i" } },
      ];
    }

    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .sort({ submittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Contact.countDocuments(filter),
    ]);

    // Map the existing Contact schema to the admin UI format.
    const items = contacts.map((contact) => ({
      _id: String(contact._id),
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.mobile || "",
      mobile: contact.mobile || "",
      interest: contact.subject || "",
      subject: contact.subject || "",
      message: contact.message || "",
      source: "Website",
      status: "new",
      createdAt: contact.submittedAt || contact.createdAt || null,
    }));

    res.json({
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin contacts fetch error:", error);
    res.status(500).json({
      message: "Unable to load website enquiries.",
    });
  }
});

router.get("/leads", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 50)
    );

    const filter = {};

    if (
      ["New", "Contacted", "Qualified", "Converted", "Lost"].includes(
        req.query.status
      )
    ) {
      filter.status = req.query.status;
    }

    if (req.query.q) {
      const q = String(req.query.q).trim().slice(0, 100);
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { message: { $regex: q, $options: "i" } },
      ];
    }

    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .sort({ submittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Contact.countDocuments(filter),
    ]);

    const items = contacts.map((contact) => ({
      ...contact,
      _id: String(contact._id),
      status: contact.status || "New",
      notes: contact.notes || "",
      source: "Website Contact Form",
      createdAt: contact.submittedAt || null,
    }));

    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Admin leads fetch error:", error);
    res.status(500).json({ message: "Unable to load leads." });
  }
});

router.patch("/leads/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid lead ID." });
  }

  const allowedStatuses = ["New", "Contacted", "Qualified", "Converted", "Lost"];
  const updates = {};

  if (req.body?.status !== undefined) {
    if (!allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid lead status." });
    }
    updates.status = req.body.status;
  }

  if (req.body?.notes !== undefined) {
    updates.notes = String(req.body.notes).slice(0, 5000);
  }

  try {
    const item = await Contact.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!item) return res.status(404).json({ message: "Lead not found." });

    res.json({
      item: {
        ...item,
        _id: String(item._id),
        status: item.status || "New",
        notes: item.notes || "",
        source: "Website Contact Form",
        createdAt: item.submittedAt || null,
      },
    });
  } catch (error) {
    console.error("Admin lead update error:", error);
    res.status(500).json({ message: "Unable to update lead." });
  }
});

router.get("/enrollments", async (req, res) => {
  try {
    const requestedType = String(req.query.type || "Internship");
    if (!["Internship", "Project"].includes(requestedType)) {
      return res
        .status(400)
        .json({ message: "Type must be Internship or Project." });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      500,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 100)
    );

    const [items, total] = await Promise.all([
      Enrollment.find({ type: requestedType })
        .populate("user", "name email mobile phone college course year")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Enrollment.countDocuments({ type: requestedType }),
    ]);

    res.json({
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
      type: requestedType,
    });
  } catch (error) {
    console.error("Admin enrollments fetch error:", error);
    res.status(500).json({ message: "Unable to load enrollments." });
  }
});

router.patch("/services/registrations/:id/amount", async (req, res) => {
  try {
    const { id } = req.params;
    const amount = Number(req.body?.amount);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service registration ID.",
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Enter an amount greater than ₹0.",
      });
    }

    const enrollmentId = new mongoose.Types.ObjectId(id);

    // Use the native collection update so priceApproved is persisted even
    // if the current Mongoose Enrollment schema has not been updated yet.
    const updateResult = await Enrollment.collection.updateOne(
      { _id: enrollmentId, type: "Service" },
      {
        $set: {
          amount,
          priceApproved: true,
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Service registration not found. Refresh and try again.",
      });
    }

    // Read the saved document directly so the response includes priceApproved.
    const item = await Enrollment.collection.findOne({ _id: enrollmentId });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Updated service registration could not be loaded.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service price updated and approved successfully.",
      item,
    });
  } catch (error) {
    console.error("Update service price error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update the service price.",
    });
  }
});

router.get("/me", (req, res) => res.json({ admin: req.admin }));

module.exports = router;