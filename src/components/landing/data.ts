import {
  Activity,
  BarChart3,
  ClipboardList,
  FolderKanban,
  ShieldCheck,
  Truck,
  Users,
  Route,
  MapPinned,
  Building2,
} from "lucide-react"

export type LandingLang = "ar" | "en"

export const landingContent: Record<LandingLang, any> = {
  ar: {
    nav: {
      links: [
        { href: "#home", label: "الرئيسية" },
        { href: "#overview", label: "نظرة المنصة" },
        { href: "#features", label: "القدرات الأساسية" },
        { href: "#workflow", label: "آلية العمل" },
        { href: "#stats", label: "مؤشرات التشغيل" },
      ],
      login: "تسجيل الدخول",
      requestAccess: "طلب الوصول",
      switchLanguage: "EN",
      logoAlt: "شعار المنصة",
    },
    hero: {
      badge: "منصة تشغيل ميداني للمؤسسات والبلديات",
      titleParts: ["تحكم تشغيلي موحّد", "لإدارة الأسطول والمسارات", "والتتبع الميداني"],
      description:
        "منصة احترافية لإدارة عمليات جمع النفايات والمهام الميدانية من مركز واحد، مع رؤية فورية للأداء، صلاحيات دقيقة، وتقارير تشغيلية تدعم القرار التنفيذي.",
      primaryCta: "طلب عرض توضيحي",
      secondaryCta: "الدخول إلى المنصة",
      panelTitle: "لوحة مؤشرات تشغيلية",
      metrics: [
        { label: "المسارات النشطة اليوم", value: "128" },
        { label: "المركبات المتابعة", value: "74" },
      ],
      statusTitle: "حالة المتابعة الميدانية",
      statusItems: [
        "اكتمال 91% من المسارات المخططة",
        "انخفاض التأخير التشغيلي بنسبة 17%",
        "تحديث بيانات الفرق خلال أقل من 3 دقائق",
      ],
    },
    overview: {
      title: "منصة موحدة لإدارة العمليات الميدانية",
      description:
        "صُممت المنصة لتمكين الجهات المشغلة من التخطيط والمتابعة والتحليل ضمن دورة تشغيل مترابطة تغطي التنفيذ الميداني من البداية حتى قياس النتائج.",
      cards: [
        {
          title: "تحكم تشغيلي مركزي",
          description: "إدارة موحدة للفروع والفرق الميدانية من لوحة واحدة واضحة قابلة للتوسع.",
          icon: Building2,
        },
        {
          title: "تتبع وتنفيذ ميداني",
          description: "مراقبة المسارات والمركبات والنقاط التشغيلية لحظة بلحظة.",
          icon: Activity,
        },
        {
          title: "حوكمة وصلاحيات دقيقة",
          description: "أدوار وصلاحيات مفصلة تضمن وضوح المسؤوليات لكل فريق.",
          icon: ShieldCheck,
        },
        {
          title: "تقارير تشغيلية قابلة للقياس",
          description: "مؤشرات أداء يومية وتقارير تحليلية تدعم القرار التنفيذي.",
          icon: BarChart3,
        },
      ],
    },
    features: {
      title: "القدرات الأساسية للمنصة",
      description:
        "تغطي المنصة المحاور التشغيلية الأساسية لإدارة الأعمال الميدانية عبر وحدات مترابطة قابلة للتوسع.",
      cards: [
        { title: "إدارة الأسطول والسائقين", description: "بيانات مركبات وسائقين وربط تشغيلي مستمر.", icon: Truck },
        { title: "إدارة المسارات والنقاط", description: "بناء مسارات الخدمة وتنظيم نقاط التنفيذ ميدانيًا.", icon: Route },
        { title: "التتبع الحي للعمليات", description: "رؤية آنية لحالة التنفيذ والحركة على الخريطة.", icon: MapPinned },
        { title: "التقارير والتحليلات", description: "لوحات مؤشرات وتقارير تصدير لدعم القرارات.", icon: BarChart3 },
        { title: "الاستبيانات والنماذج", description: "جمع بيانات ميدانية منظمة من فرق العمل.", icon: ClipboardList },
        { title: "المواد والمخزون", description: "إدارة المواد والتصنيفات وحركة المخزون بشكل مترابط.", icon: FolderKanban },
        { title: "الأدوار والصلاحيات", description: "تحكم كامل في الوصول حسب هيكل الجهة المشغلة.", icon: Users },
      ],
    },
    workflow: {
      title: "كيف تعمل المنصة؟",
      description: "مسار عمل واضح يساعد الفرق التشغيلية على التحضير والتنفيذ والمتابعة والتحسين المستمر.",
      stepLabel: "الخطوة",
      steps: [
        { title: "تهيئة البيانات التشغيلية", description: "تعريف الفروع والمركبات والسائقين والنقاط وفق واقع التشغيل." },
        { title: "إسناد المهام والمخططات", description: "توزيع المسارات والمهام على الفرق مع ضبط الصلاحيات والمتابعة." },
        { title: "مراقبة التنفيذ الميداني", description: "متابعة الحركة والزيارات والأحداث التشغيلية أثناء العمل اليومي." },
        { title: "مراجعة الأداء والتطوير", description: "تحليل النتائج وإصدار التقارير لتحسين الكفاءة وجودة الخدمة." },
      ],
    },
    stats: {
      title: "مؤشرات ثقة تشغيلية",
      description: "أمثلة على المؤشرات التي تتابعها الجهات المشغلة لقياس كفاءة التنفيذ الميداني.",
      items: [
        { label: "تغطية نقاط الخدمة", value: "98.2%" },
        { label: "الالتزام بخطط المسارات", value: "+91%" },
        { label: "متوسط زمن الاستجابة", value: "12 دقيقة" },
        { label: "دقة تقارير المتابعة", value: "99%" },
      ],
    },
    cta: {
      title: "جاهزون لرفع كفاءة التشغيل الميداني؟",
      description:
        "ابدأ بخطوة عملية نحو إدارة ميدانية أكثر دقة ووضوحًا، مع منصة قابلة للتوسع حسب احتياج الجهة المشغلة.",
      primary: "طلب الوصول",
      secondary: "تسجيل الدخول",
    },
    footer: {
      brand: "منصة التشغيل الميداني",
      description:
        "منصة عربية لإدارة عمليات النفايات والرقابة الميدانية والتقارير التشغيلية للجهات المشغلة والبلديات.",
      quickLinks: "روابط سريعة",
      contact: "تواصل",
      emailLabel: "البريد",
      phoneLabel: "الهاتف",
      loginLink: "الدخول للمنصة",
      rights: "جميع الحقوق محفوظة",
    },
  },
  en: {
    nav: {
      links: [
        { href: "#home", label: "Home" },
        { href: "#overview", label: "Platform Overview" },
        { href: "#features", label: "Core Features" },
        { href: "#workflow", label: "How It Works" },
        { href: "#stats", label: "Operational Metrics" },
      ],
      login: "Login",
      requestAccess: "Request Access",
      switchLanguage: "AR",
      logoAlt: "Platform logo",
    },
    hero: {
      badge: "Field Operations Platform for Municipal and Enterprise Teams",
      titleParts: ["Unified Operational Control", "for Fleet, Routes,", "and Field Tracking"],
      description:
        "A professional platform to manage waste collection and field operations from one center, with real-time visibility, granular permissions, and executive reporting.",
      primaryCta: "Request Demo",
      secondaryCta: "Access Platform",
      panelTitle: "Operations Snapshot",
      metrics: [
        { label: "Active Routes Today", value: "128" },
        { label: "Tracked Vehicles", value: "74" },
      ],
      statusTitle: "Field Monitoring Status",
      statusItems: [
        "91% planned route completion",
        "17% reduction in operational delays",
        "Team data sync in under 3 minutes",
      ],
    },
    overview: {
      title: "A Unified Platform for Field Operations",
      description:
        "Built to help operating entities plan, execute, monitor, and analyze work in a connected operational lifecycle.",
      cards: [
        {
          title: "Centralized Operations Control",
          description: "Manage branches and field teams from one scalable control layer.",
          icon: Building2,
        },
        {
          title: "Live Field Execution Visibility",
          description: "Monitor routes, vehicles, and service points in real time.",
          icon: Activity,
        },
        {
          title: "Governance and Granular Access",
          description: "Role-based controls to keep responsibilities clear and secure.",
          icon: ShieldCheck,
        },
        {
          title: "Actionable Operational Reporting",
          description: "Track KPIs and generate reports that support executive decisions.",
          icon: BarChart3,
        },
      ],
    },
    features: {
      title: "Core Platform Capabilities",
      description: "Purpose-built modules for planning, execution, monitoring, and optimization.",
      cards: [
        { title: "Fleet and Driver Management", description: "Maintain driver and vehicle data with operational assignments.", icon: Truck },
        { title: "Routes and Service Points", description: "Design service routes and structure point execution clearly.", icon: Route },
        { title: "Live Tracking", description: "Get real-time visibility of movement and field progress.", icon: MapPinned },
        { title: "Reports and Analytics", description: "Review performance through dashboards and exportable reports.", icon: BarChart3 },
        { title: "Forms and Surveys", description: "Collect structured field data from operational teams.", icon: ClipboardList },
        { title: "Inventory and Materials", description: "Manage material categories, stock, and movement flows.", icon: FolderKanban },
        { title: "Roles and Permissions", description: "Control platform access through a clear permission model.", icon: Users },
      ],
    },
    workflow: {
      title: "How the Platform Works",
      description: "A clear workflow for onboarding, assignment, live execution, and continuous improvement.",
      stepLabel: "Step",
      steps: [
        { title: "Prepare Operational Data", description: "Define branches, vehicles, drivers, and service points." },
        { title: "Assign Plans and Tasks", description: "Distribute routes and tasks with controlled access by role." },
        { title: "Track Field Execution", description: "Monitor movement, visits, and operational events in real time." },
        { title: "Review and Improve", description: "Analyze outcomes and issue reports to improve efficiency." },
      ],
    },
    stats: {
      title: "Operational Trust Indicators",
      description: "Example KPIs used by operating entities to monitor field performance.",
      items: [
        { label: "Service Point Coverage", value: "98.2%" },
        { label: "Route Plan Compliance", value: "+91%" },
        { label: "Average Response Time", value: "12 min" },
        { label: "Reporting Accuracy", value: "99%" },
      ],
    },
    cta: {
      title: "Ready to improve field execution efficiency?",
      description:
        "Take a practical next step toward clearer, faster, and more reliable operations management.",
      primary: "Request Access",
      secondary: "Login",
    },
    footer: {
      brand: "Field Operations Platform",
      description:
        "A modern operations platform for waste management, field supervision, and performance reporting.",
      quickLinks: "Quick Links",
      contact: "Contact",
      emailLabel: "Email",
      phoneLabel: "Phone",
      loginLink: "Access Platform",
      rights: "All rights reserved",
    },
  },
}
