const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Users
  await prisma.user.upsert({
    where: { email: "admin@promodash.local" },
    update: {},
    create: { id: "user-admin", name: "Admin Team", email: "admin@promodash.local", password: "password", role: "admin" },
  });
  await prisma.user.upsert({
    where: { email: "client@cognesense.com" },
    update: {},
    create: { id: "user-cognesense", name: "Cognesense Client", email: "client@cognesense.com", password: "password", role: "client", company: "Cognesense" },
  });
  await prisma.user.upsert({
    where: { email: "marketing@northstar.example" },
    update: {},
    create: { id: "user-northstar", name: "Northstar Marketing", email: "marketing@northstar.example", password: "password", role: "client", company: "Northstar Labs" },
  });

  // Promotion Types
  await prisma.promotionType.upsert({
    where: { id: "social" },
    update: {},
    create: { id: "social", name: "Social Media Campaign", description: "Banners, captions, and post creatives for social profiles." },
  });
  await prisma.promotionType.upsert({
    where: { id: "email" },
    update: {},
    create: { id: "email", name: "Email Campaign", description: "PDF or image previews for email blast approvals." },
  });

  // Clients
  await prisma.client.upsert({
    where: { email: "client@cognesense.com" },
    update: {},
    create: { id: "client-cognesense", name: "Cognesense Client", email: "client@cognesense.com", company: "Cognesense" },
  });
  await prisma.client.upsert({
    where: { email: "marketing@northstar.example" },
    update: {},
    create: { id: "client-northstar", name: "Northstar Marketing", email: "marketing@northstar.example", company: "Northstar Labs" },
  });

  // Projects
  await prisma.project.upsert({
    where: { id: "project-cognesense" },
    update: {},
    create: {
      id: "project-cognesense", name: "Cognesense Projects", client: "Cognesense", owner: "Growth Team",
      description: "Marketing approvals for social media and email campaigns.",
      clientUsers: ["client@cognesense.com"],
      createdAt: new Date("2026-04-10T09:30:00Z"),
    },
  });
  await prisma.project.upsert({
    where: { id: "project-northstar" },
    update: {},
    create: {
      id: "project-northstar", name: "Northstar Product Rollout", client: "Northstar Labs", owner: "Growth Team",
      description: "Launch promotions and lifecycle email assets.",
      clientUsers: ["marketing@northstar.example"],
      createdAt: new Date("2026-04-12T11:00:00Z"),
    },
  });

  // Promotions (no currentVersionId yet)
  await prisma.promotion.upsert({
    where: { id: "promo-ai-launch" },
    update: {},
    create: {
      id: "promo-ai-launch", projectId: "project-cognesense", title: "AI Workflow Launch", typeId: "social",
      scheduledDate: new Date("2026-04-25"), status: "Pending_Approval",
      description: "LinkedIn launch campaign for the new workflow automation feature.",
      captions: ["Cognesense teams can now review complex project signals in one streamlined approval workspace.", "Launch faster with one place for context, comments, versions, and final sign-off."],
      createdAt: new Date("2026-04-17T10:30:00Z"),
    },
  });
  await prisma.promotion.upsert({
    where: { id: "promo-newsletter" },
    update: {},
    create: {
      id: "promo-newsletter", projectId: "project-cognesense", title: "April Product Newsletter", typeId: "email",
      scheduledDate: new Date("2026-04-28"), status: "Revision_Required",
      description: "Monthly product update email with customer story and feature highlights.",
      subjectLine: "April product updates from Cognesense", contactList: "Cognesense newsletter subscribers",
      createdAt: new Date("2026-04-18T12:15:00Z"),
    },
  });
  await prisma.promotion.upsert({
    where: { id: "promo-webinar" },
    update: {},
    create: {
      id: "promo-webinar", projectId: "project-cognesense", title: "Customer Webinar Reminder", typeId: "social",
      scheduledDate: new Date("2026-05-02"), status: "Draft",
      description: "Reminder banner and short caption set for the upcoming webinar.",
      captions: ["Reserve your seat for Cognesense Live: practical strategies for faster project approvals."],
      createdAt: new Date("2026-04-19T08:30:00Z"),
    },
  });
  await prisma.promotion.upsert({
    where: { id: "promo-northstar-drip" },
    update: {},
    create: {
      id: "promo-northstar-drip", projectId: "project-northstar", title: "Beta Invite Drip", typeId: "email",
      scheduledDate: new Date("2026-04-30"), status: "Approved",
      description: "Three-part beta invitation sequence.",
      subjectLine: "Your Northstar beta invitation", contactList: "Northstar beta waitlist",
      createdAt: new Date("2026-04-14T15:45:00Z"),
    },
  });

  // Versions
  await prisma.version.upsert({ where: { id: "ver-ai-launch-1" }, update: {}, create: { id: "ver-ai-launch-1", promotionId: "promo-ai-launch", version: 1, label: "Initial banner concept", fileName: "launch-banner-v1.png", fileType: "image", uploadedBy: "Admin", uploadedAt: new Date("2026-04-17T10:45:00Z"), url: "/uploads/placeholder.png", notes: "First layout with launch headline." } });
  await prisma.version.upsert({ where: { id: "ver-ai-launch-2" }, update: {}, create: { id: "ver-ai-launch-2", promotionId: "promo-ai-launch", version: 2, label: "Updated CTA", fileName: "launch-banner-v2.png", fileType: "image", uploadedBy: "Admin", uploadedAt: new Date("2026-04-19T16:10:00Z"), url: "/uploads/placeholder.png", notes: "Adjusted call to action and typography." } });
  await prisma.version.upsert({ where: { id: "ver-newsletter-1" }, update: {}, create: { id: "ver-newsletter-1", promotionId: "promo-newsletter", version: 1, label: "PDF email preview", fileName: "april-newsletter-preview.pdf", fileType: "pdf", uploadedBy: "Admin", uploadedAt: new Date("2026-04-18T12:40:00Z"), url: "/uploads/placeholder.pdf", notes: "Email design exported as PDF." } });
  await prisma.version.upsert({ where: { id: "ver-webinar-1" }, update: {}, create: { id: "ver-webinar-1", promotionId: "promo-webinar", version: 1, label: "Draft creative", fileName: "webinar-reminder.png", fileType: "image", uploadedBy: "Admin", uploadedAt: new Date("2026-04-19T09:00:00Z"), url: "/uploads/placeholder.png", notes: "Draft for internal review." } });
  await prisma.version.upsert({ where: { id: "ver-northstar-1" }, update: {}, create: { id: "ver-northstar-1", promotionId: "promo-northstar-drip", version: 1, label: "Approved PDF", fileName: "beta-invite.pdf", fileType: "pdf", uploadedBy: "Admin", uploadedAt: new Date("2026-04-15T11:00:00Z"), url: "/uploads/placeholder.pdf", notes: "Client approved." } });

  // Set currentVersionId
  await prisma.promotion.update({ where: { id: "promo-ai-launch" }, data: { currentVersionId: "ver-ai-launch-2" } });
  await prisma.promotion.update({ where: { id: "promo-newsletter" }, data: { currentVersionId: "ver-newsletter-1" } });
  await prisma.promotion.update({ where: { id: "promo-webinar" }, data: { currentVersionId: "ver-webinar-1" } });
  await prisma.promotion.update({ where: { id: "promo-northstar-drip" }, data: { currentVersionId: "ver-northstar-1" } });

  // Comments
  await prisma.comment.upsert({ where: { id: "comment-1" }, update: {}, create: { id: "comment-1", promotionId: "promo-ai-launch", author: "Client", role: "client", body: "The layout works. Can we make the CTA feel more action-oriented?", createdAt: new Date("2026-04-19T09:22:00Z") } });
  await prisma.comment.upsert({ where: { id: "comment-2" }, update: {}, create: { id: "comment-2", promotionId: "promo-ai-launch", author: "Admin", role: "admin", body: "Updated in version 2 with a stronger CTA and cleaner hierarchy.", createdAt: new Date("2026-04-19T16:12:00Z") } });
  await prisma.comment.upsert({ where: { id: "comment-3" }, update: {}, create: { id: "comment-3", promotionId: "promo-newsletter", author: "Client", role: "client", body: "Please move the customer quote higher and shorten the intro paragraph.", createdAt: new Date("2026-04-20T13:04:00Z") } });

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
