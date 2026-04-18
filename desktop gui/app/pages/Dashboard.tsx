import { motion } from "motion/react";
import { Link } from "react-router";
import {
  Activity,
  Image as ImageIcon,
  Video,
  MessageSquare,
  TrendingUp,
  Zap,
  Clock,
  ArrowRight,
} from "lucide-react";

export function Dashboard() {
  const stats = [
    {
      label: "API Calls Today",
      value: "24,567",
      change: "+12.5%",
      icon: Activity,
      color: "cyan",
    },
    {
      label: "Generated Images",
      value: "1,834",
      change: "+8.2%",
      icon: ImageIcon,
      color: "purple",
    },
    {
      label: "Generated Videos",
      value: "432",
      change: "+15.3%",
      icon: Video,
      color: "magenta",
    },
    {
      label: "Active Models",
      value: "12",
      change: "+2",
      icon: Zap,
      color: "green",
    },
  ];

  const recentActivity = [
    {
      type: "image",
      title: "Cyberpunk cityscape at night",
      time: "2 min ago",
      model: "grok-imagine-pro",
    },
    {
      type: "video",
      title: "Abstract motion graphics",
      time: "5 min ago",
      model: "grok-video-gen",
    },
    {
      type: "chat",
      title: "Code review assistance",
      time: "12 min ago",
      model: "grok-4.20-reasoning",
    },
    {
      type: "image",
      title: "Product photography concept",
      time: "18 min ago",
      model: "grok-imagine-image",
    },
  ];

  const quickActions = [
    {
      to: "/chat",
      icon: MessageSquare,
      label: "New Chat",
      description: "Start AI conversation",
      gradient: "from-[#00F0FF] to-[#00A8B8]",
    },
    {
      to: "/images",
      icon: ImageIcon,
      label: "Generate Images",
      description: "Create bulk images",
      gradient: "from-[#B026FF] to-[#7018AA]",
    },
    {
      to: "/videos",
      icon: Video,
      label: "Create Video",
      description: "Generate video content",
      gradient: "from-[#FF00FF] to-[#B026FF]",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome to your AI Studio control center</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="glass-strong rounded-xl p-6 border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`p-3 rounded-lg bg-gradient-to-br ${
                  stat.color === "cyan"
                    ? "from-[#00F0FF]/20 to-[#00F0FF]/5"
                    : stat.color === "purple"
                    ? "from-[#B026FF]/20 to-[#B026FF]/5"
                    : stat.color === "magenta"
                    ? "from-[#FF00FF]/20 to-[#FF00FF]/5"
                    : "from-[#00FF88]/20 to-[#00FF88]/5"
                }`}
              >
                <stat.icon
                  className={`w-6 h-6 ${
                    stat.color === "cyan"
                      ? "text-[#00F0FF]"
                      : stat.color === "purple"
                      ? "text-[#B026FF]"
                      : stat.color === "magenta"
                      ? "text-[#FF00FF]"
                      : "text-[#00FF88]"
                  }`}
                />
              </div>
              <div className="flex items-center gap-1 text-[#00FF88] text-sm">
                <TrendingUp className="w-4 h-4" />
                {stat.change}
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
            <p className="text-gray-400 text-sm">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-2 glass-strong rounded-xl p-6 border border-white/[0.08]"
        >
          <h2 className="text-xl font-bold mb-6">Quick Start</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Link key={action.to} to={action.to}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="glass rounded-xl p-6 border border-white/[0.08] hover:border-white/[0.2] transition-all duration-300 group cursor-pointer"
                >
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold mb-1 group-hover:text-[#00F0FF] transition-colors">
                    {action.label}
                  </h3>
                  <p className="text-sm text-gray-400">{action.description}</p>
                  <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-[#00F0FF] group-hover:translate-x-1 transition-all mt-3" />
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass-strong rounded-xl p-6 border border-white/[0.08]"
        >
          <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    activity.type === "image"
                      ? "bg-[#B026FF]/20"
                      : activity.type === "video"
                      ? "bg-[#FF00FF]/20"
                      : "bg-[#00F0FF]/20"
                  }`}
                >
                  {activity.type === "image" ? (
                    <ImageIcon className="w-5 h-5 text-[#B026FF]" />
                  ) : activity.type === "video" ? (
                    <Video className="w-5 h-5 text-[#FF00FF]" />
                  ) : (
                    <MessageSquare className="w-5 h-5 text-[#00F0FF]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <p className="text-xs text-gray-500 truncate">{activity.model}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                    <Clock className="w-3 h-3" />
                    {activity.time}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
