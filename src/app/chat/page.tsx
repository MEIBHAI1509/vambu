'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Search, Settings, MessageSquare, Send, User, MoreVertical, Loader2, Home, Users, Star, Calendar, FileText, Bell, Edit } from 'lucide-react'
import { STORAGE_URL } from '@/utils/common'
import Image from 'next/image'

// Mock data to show a beautiful UI
const mockContacts = [
  { id: 1, name: 'Alice Smith', avatar: 'AS', lastMessage: 'See you tomorrow!', time: '10:30 AM', online: true, unread: 0 },
  { id: 2, name: 'Bob Johnson', avatar: 'BJ', lastMessage: 'Thanks for the help.', time: 'Yesterday', online: false, unread: 2 },
  { id: 3, name: 'Charlie Brown', avatar: 'CB', lastMessage: 'Are we still on for the meeting?', time: 'Tuesday', online: true, unread: 0 },
  { id: 4, name: 'David Lee', avatar: 'DL', lastMessage: 'Check out this sketch', time: '12:04 PM', online: true, unread: 3 },
  { id: 5, name: 'Emma Watson', avatar: 'EW', lastMessage: 'Let me know when you are free.', time: '11:45 AM', online: false, unread: 0 },
]

const mockMessages = [
  { id: 1, text: 'Hey team 👋 Let\'s hop on a call to discuss the new project.', sender: 'them', time: '12:11 PM', name: 'Emma Watson' },
  { id: 2, text: 'Good Concepts! 🙏', sender: 'them', time: '12:13 PM', name: 'Bob Johnson' },
  { id: 3, text: 'Check out pls this initial sketch for our new project? 🤔', sender: 'me', time: '12:15 PM' },
  { id: 4, text: 'Looks amazing! The typography options are great.', sender: 'them', time: '12:18 PM', name: 'Alice Smith' },
  { id: 5, text: 'I\'ll prepare the final assets by tomorrow.', sender: 'me', time: '12:20 PM' },
]

export default function ChatPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [activeChat, setActiveChat] = useState<number | null>(4)
  const [messageText, setMessageText] = useState('')
  const [activeTab, setActiveTab] = useState('messages')

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      setUserEmail(session.user.email ?? 'User')
      setLoading(false)
    }
    checkUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] text-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-[#141235] mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading workspace...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-foreground overflow-hidden font-sans p-2 md:p-4 gap-4">
      {/* Primary Sidebar - Very Dark Theme */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-[80px] md:w-[260px] flex-shrink-0 bg-[#141235] rounded-3xl flex flex-col text-white/70 overflow-hidden shadow-xl z-30"
      >
        {/* Logo Area */}
        <div className="p-6 md:p-8 flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          {/* <MessageSquare className="w-6 h-6 text-blue-500" /> */}
          <Image src={`${STORAGE_URL}/logo/vambu-logo.png`} alt="Vambu Logo" width={40} height={40} className="object-contain drop-shadow-md rounded-full" />
          <span>Vambu</span>
        </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-4 py-4 flex flex-col gap-2">
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard' },
            { id: 'messages', icon: MessageSquare, label: 'Messages', badge: 13 },
            { id: 'groups', icon: Users, label: 'Groups' },
            { id: 'favourites', icon: Star, label: 'Favourites' },
            { id: 'calendar', icon: Calendar, label: 'Calendar' },
            { id: 'ai-chat', icon: MessageSquare, label: 'AI Chat' },
            { id: 'files', icon: FileText, label: 'Files' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map((item, idx) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + (idx * 0.05) }}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden group ${
                activeTab === item.id 
                  ? 'bg-white/10 text-white font-medium shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                  : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.id ? 'text-white' : 'text-white/50 group-hover:text-white/80 transition-colors'}`} />
              <span className="hidden md:block text-sm">{item.label}</span>
              {item.badge && (
                <span className="hidden md:flex absolute right-4 bg-white text-[#141235] text-[10px] font-bold w-5 h-5 rounded-full items-center justify-center">
                  {item.badge}
                </span>
              )}
              {/* Active Indicator Line */}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeNav"
                  className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-full"
                />
              )}
            </motion.button>
          ))}
        </div>

        {/* User Profile in Sidebar */}
        <div className="p-6 mt-auto">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer" onClick={handleLogout}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF9A9E] to-[#FECFEF] text-[#141235] flex items-center justify-center font-bold shadow-inner shrink-0">
              {userEmail?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col overflow-hidden">
              <span className="font-semibold text-sm text-white truncate">{userEmail?.split('@')[0]}</span>
              <span className="text-xs text-white/50 truncate">@user.ui</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex-1 bg-white rounded-3xl shadow-sm flex overflow-hidden border border-[#Eef0f2] relative z-20"
      >
        {/* Chat Window */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#FAFBFC]">
          {/* Top Top Nav of Chat */}
          <div className="h-20 px-8 flex items-center justify-between border-b border-[#F0F2F5] bg-white z-10 shrink-0">
            <div className="flex items-center gap-6">
               <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white border-2 border-white font-bold z-40">N</div>
                  <div className="w-10 h-10 rounded-full bg-blue-400 border-2 border-white z-30 flex items-center justify-center text-white text-xs">AS</div>
                  <div className="w-10 h-10 rounded-full bg-purple-400 border-2 border-white z-20 flex items-center justify-center text-white text-xs">BJ</div>
                  <div className="w-10 h-10 rounded-full bg-green-400 border-2 border-white z-10 flex items-center justify-center text-white text-xs">CB</div>
               </div>
               <div>
                 <h2 className="font-bold text-[#141235]">Nixtio Team</h2>
                 <p className="text-xs font-medium text-green-500">+6 Online</p>
               </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="w-10 h-10 rounded-2xl bg-[#F4F5F7] text-[#141235] flex items-center justify-center hover:bg-[#E8EAED] transition-colors">
                <Star className="w-5 h-5 fill-current" />
              </button>
              <button className="w-10 h-10 rounded-2xl bg-[#F4F5F7] text-[#141235] flex items-center justify-center hover:bg-[#E8EAED] transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-2xl bg-[#F4F5F7] text-[#141235] flex items-center justify-center hover:bg-[#E8EAED] transition-colors">
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative bg-[#FAFBFC]">
            
            {/* Date Separator */}
            <div className="flex justify-center my-6">
              <span className="text-xs font-medium text-muted-foreground bg-white px-4 py-1.5 rounded-full shadow-sm border border-[#F0F2F5]">Today, August 23</span>
            </div>

            <AnimatePresence>
              {mockMessages.map((msg, i) => {
                const isMe = msg.sender === 'me';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
                    className={`flex gap-3 w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex-shrink-0 mt-auto shadow-sm flex items-center justify-center text-xs font-bold text-blue-800">
                        {msg.name?.split(' ').map(n=>n[0]).join('')}
                      </div>
                    )}
                    
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      {!isMe && <span className="text-xs font-medium text-muted-foreground mb-1.5 ml-1">{msg.name}</span>}
                      
                      <div 
                        className={`px-5 py-3.5 relative group ${
                          isMe 
                            ? 'bg-[#F2E8FF] text-[#141235] rounded-3xl rounded-br-sm' 
                            : 'bg-white border border-[#Eef0f2] text-[#141235] rounded-3xl rounded-bl-sm shadow-sm'
                        }`}
                      >
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        
                        {/* Time and Tick indicator inside bubble for 'me' */}
                        {isMe && (
                          <div className="flex items-center gap-1 justify-end mt-1 opacity-60">
                            <span className="text-[10px] font-medium">{msg.time}</span>
                            <span className="text-[10px]">✓✓</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Time for 'them' outside bubble */}
                      {!isMe && (
                         <div className="flex items-center gap-1 mt-1 ml-1 text-muted-foreground">
                           <span className="text-[10px] font-medium">{msg.time}</span>
                         </div>
                      )}
                    </div>

                    {isMe && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF9A9E] to-[#FECFEF] flex-shrink-0 mt-auto shadow-sm flex items-center justify-center text-xs font-bold text-[#141235]">
                         {userEmail?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Typing indicator */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex items-center gap-3 text-muted-foreground text-sm"
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 overflow-hidden">
                 <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=monika`} alt="typing" className="w-full h-full object-cover"/>
              </div>
              <span className="font-medium text-[#141235] text-xs">Monika is typing...</span>
            </motion.div>
            
            {/* Auto-scroll anchor */}
            <div className="h-4" />
          </div>

          {/* Message Input Container */}
          <div className="p-6 bg-white border-t border-[#F0F2F5] shrink-0">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if(messageText.trim()) {
                  // Mock sending logic
                  setMessageText('');
                }
              }} 
              className="flex items-center gap-3 bg-[#F4F5F7] rounded-3xl p-2 transition-all focus-within:ring-2 focus-within:ring-purple-200 focus-within:bg-white focus-within:shadow-sm"
            >
              <button type="button" className="p-3 text-muted-foreground hover:text-[#141235] transition-colors rounded-full hover:bg-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
              
              <input
                type="text"
                placeholder="Type Message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 bg-transparent border-none focus:outline-none text-[15px] text-[#141235] placeholder:text-[#A0A4AB] py-3"
              />
              
              <button type="button" className="p-3 text-muted-foreground hover:text-[#141235] transition-colors rounded-full hover:bg-white mr-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
              </button>

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!messageText.trim()}
                className="w-12 h-12 bg-[#141235] text-white rounded-full flex items-center justify-center disabled:opacity-50 transition-all shadow-md shrink-0"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </motion.button>
            </form>
          </div>
        </div>

        {/* Right Sidebar - Chats List (Replicating the right side of the image) */}
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-[320px] bg-white border-l border-[#F0F2F5] hidden lg:flex flex-col z-20"
        >
          <div className="p-6 flex items-center justify-between border-b border-[#F0F2F5]">
            <h2 className="text-xl font-bold text-[#141235]">Messages</h2>
            <button className="w-10 h-10 bg-[#F4F5F7] rounded-full flex items-center justify-center text-[#141235] hover:bg-[#E8EAED] transition-colors">
              <Edit className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 pb-2">
            {/* Stories / Active Users row */}
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
              <div className="flex flex-col items-center gap-2 shrink-0 cursor-pointer">
                <div className="w-14 h-14 rounded-full border-[3px] border-white ring-2 ring-purple-200 bg-gray-100 overflow-hidden relative">
                   <img src="https://api.dicebear.com/7.x/notionists/svg?seed=daniel" className="w-full h-full object-cover" alt="Daniel" />
                   <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <span className="text-[11px] font-medium text-[#141235]">Daniel</span>
              </div>
              
              <div className="flex flex-col items-center gap-2 shrink-0 cursor-pointer">
                <div className="w-14 h-14 rounded-full bg-[#141235] text-white flex items-center justify-center text-xl font-bold border-[3px] border-white ring-2 ring-blue-500">
                  N
                </div>
                <span className="text-[11px] font-bold text-[#141235]">Nixtio</span>
              </div>

              <div className="flex flex-col items-center gap-2 shrink-0 cursor-pointer">
                <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden relative">
                   <img src="https://api.dicebear.com/7.x/notionists/svg?seed=anna" className="w-full h-full object-cover" alt="Anna" />
                   <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">Anna</span>
              </div>
            </div>

            {/* Search Input */}
            <div className="mt-4 relative">
              <input 
                type="text" 
                placeholder="Search or start a new chat" 
                className="w-full bg-[#F4F5F7] text-sm rounded-2xl py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-shadow placeholder:text-[#A0A4AB]"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
            <div className="pt-2 pb-4">
              <div className="flex items-center gap-2 px-2 mb-4 text-[#141235]">
                <Star className="w-4 h-4 fill-current" />
                <h3 className="text-sm font-bold">Pinned Chats</h3>
              </div>

              {[mockContacts[0], mockContacts[1], mockContacts[2]].map((contact, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  key={`pinned-${contact.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#F4F5F7] cursor-pointer transition-colors mb-1"
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-gray-600 overflow-hidden">
                       <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${contact.name}`} className="w-full h-full object-cover" alt={contact.name} />
                    </div>
                    {contact.online && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="font-bold text-sm text-[#141235] truncate">{contact.name}</h4>
                      <span className="text-[10px] text-muted-foreground shrink-0">{contact.time}</span>
                    </div>
                    <p className={`text-[13px] truncate ${contact.unread ? 'text-[#141235] font-semibold' : 'text-muted-foreground'}`}>
                      {contact.lastMessage}
                    </p>
                  </div>
                  {contact.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-[#141235] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {contact.unread}
                    </div>
                  )}
                </motion.div>
              ))}

              <div className="flex items-center gap-2 px-2 mt-6 mb-4 text-[#141235]">
                <MessageSquare className="w-4 h-4 fill-current" />
                <h3 className="text-sm font-bold">All Chats</h3>
              </div>

              {/* Mock active chat selection */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAFBFC] shadow-[inset_0_0_0_2px_#141235] cursor-pointer transition-colors mb-1"
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-[#141235] flex items-center justify-center font-bold text-white overflow-hidden text-xl border border-gray-100">
                    N
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="font-bold text-sm text-[#141235] truncate">Nixtio Team</h4>
                    <span className="text-[10px] text-[#141235] font-medium shrink-0">12:13</span>
                  </div>
                  <p className="text-[13px] text-green-600 font-medium truncate flex items-center gap-1">
                     Daniel is typing...
                  </p>
                </div>
              </motion.div>

              {[mockContacts[3], mockContacts[4]].map((contact, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + (i * 0.1) }}
                  key={`all-${contact.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#F4F5F7] cursor-pointer transition-colors mb-1"
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-gray-600 overflow-hidden">
                       <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${contact.name}`} className="w-full h-full object-cover" alt={contact.name} />
                    </div>
                    {contact.online && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="font-bold text-sm text-[#141235] truncate">{contact.name}</h4>
                      <span className="text-[10px] text-muted-foreground shrink-0">{contact.time}</span>
                    </div>
                    <p className={`text-[13px] truncate ${contact.unread ? 'text-[#141235] font-semibold' : 'text-muted-foreground'}`}>
                      {contact.lastMessage}
                    </p>
                  </div>
                </motion.div>
              ))}

            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}