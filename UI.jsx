import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Trophy, 
  Plus, 
  Settings, 
  Share2, 
  Trash2, 
  Shield, 
  ShieldAlert,
  MoreVertical, 
  X, 
  Search, 
  Bell, 
  Moon, 
  User, 
  Home, 
  List, 
  CalendarDays, 
  Activity, 
  Sparkles, 
  Copy, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  RefreshCw, 
  Minus, 
  Star, 
  Target, 
  PieChart, 
  BarChart3, 
  Calendar, 
  Lock, 
  RotateCcw,
  UserMinus,
  UserPlus,
  Link as LinkIcon,
  LogOut,
  HelpCircle,
  FileText,
  Smartphone,
  Globe,
  Edit3,
  Flame,
  Zap,
  CloudRain,
  Ruler
} from 'lucide-react';

// --- STYLES ---
const GlobalStyles = () => (
  <style>{`
    /* Ocultar scrollbars agresivamente */
    ::-webkit-scrollbar {
      width: 0px;
      height: 0px;
      display: none;
    }
    * {
      -ms-overflow-style: none; /* IE and Edge */
      scrollbar-width: none; /* Firefox */
      -webkit-tap-highlight-color: transparent;
    }
    html, body {
      overscroll-behavior-y: none; /* Evitar rebote en pull-to-refresh nativo */
    }
  `}</style>
);

// --- AUXILIARY COMPONENTS (Defined outside App to avoid re-renders/scope issues) ---

const NavIcon = ({ icon, label, isActive, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-lime-600' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <div className={`${isActive ? 'bg-lime-100 p-1.5 rounded-lg' : ''}`}>
      {icon}
    </div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const Header = ({ title, subtitle, icon: Icon, onConfigClick, onProfileClick }) => (
  <header className="px-5 pt-12 pb-6 bg-white shadow-sm rounded-b-3xl z-10 sticky top-0">
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-2">
        <div className="bg-slate-900 p-1.5 rounded-lg text-lime-400 shadow-sm">
            <Trophy size={18} strokeWidth={2.5} />
        </div>
        <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">
            Fulbito<span className="text-lime-500">Prode</span>
        </h1>
      </div>

      <div className="flex gap-2">
        <button className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
          <Moon size={18} />
        </button>
        <button className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <button 
            onClick={onConfigClick}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
        >
          <Settings size={18} />
        </button>
        <button 
            onClick={onProfileClick}
            className="p-2 rounded-full bg-lime-100 text-lime-700 font-bold text-sm h-9 w-9 flex items-center justify-center transition-colors hover:bg-lime-200"
        >
          FC
        </button>
      </div>
    </div>
    
    <div className="flex items-center gap-2">
      <div className="bg-lime-400 p-1.5 rounded-lg text-white">
        {Icon && <Icon size={18} />}
      </div>
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      <span className="text-sm text-slate-400 font-medium ml-auto">{subtitle}</span>
    </div>
  </header>
);

const GroupSelectorModal = ({ activeGroup, setActiveGroup, onClose, groups }) => (
    <div className="absolute inset-0 z-50 flex items-end justify-center sm:rounded-[32px] overflow-hidden no-scrollbar">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
        <div className="bg-white w-full rounded-t-3xl p-6 relative shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[70%] overflow-y-auto no-scrollbar">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 text-lg">Cambiar Grupo</h3>
                <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400"><X size={20}/></button>
            </div>
            <div className="space-y-2 no-scrollbar">
                {groups.map(group => (
                    <button 
                        key={group.id} 
                        onClick={() => { setActiveGroup(group); onClose(); }} 
                        className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${activeGroup.id === group.id ? 'bg-lime-50 border-2 border-lime-400' : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'}`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center text-sm font-bold ${activeGroup.id === group.id ? 'bg-lime-200 text-lime-800' : 'bg-white text-slate-500 shadow-sm'}`}>
                                {group.name.substring(0,2).toUpperCase()}
                            </div>
                            <div className="text-left min-w-0">
                                <p className={`text-sm font-bold truncate ${activeGroup.id === group.id ? 'text-slate-900' : 'text-slate-700'}`}>{group.name}</p>
                                <p className="text-xs text-slate-500 truncate">{group.competition}</p>
                            </div>
                        </div>
                        {activeGroup.id === group.id && <div className="bg-lime-400 text-white p-1 rounded-full flex-shrink-0"><Check size={14} strokeWidth={3} /></div>}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

const StatRow = ({ icon, label, subLabel, value, color, bg }) => (
    <div className="flex justify-between items-center px-4 py-3 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
            <div className={`${bg} p-1.5 rounded-lg ${color}`}>{icon}</div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700">{label}</span>
                <span className="text-[9px] text-slate-400">{subLabel}</span>
            </div>
        </div>
        <span className="text-base font-black text-slate-800">{value}</span>
    </div>
);

const PredictionModal = ({ match, tempScores, handleScoreChange, onSave, onCancel }) => (
    <div className="absolute inset-0 z-50 flex items-end justify-center sm:rounded-[32px] overflow-hidden no-scrollbar">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onCancel}></div>
        <div className="bg-white w-full rounded-t-3xl p-5 relative shadow-2xl animate-in slide-in-from-bottom duration-300 no-scrollbar">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4"></div>
            <div className="text-center mb-6"><h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Pronóstico</h3><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cierra: {match.time}</span></div>
            <div className="flex items-center justify-between gap-4 mb-8">
                {/* Home */}
                <div className="flex flex-col items-center w-1/3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white mb-2 shadow-sm ${match.homeLogo}`}>{match.home.substring(0,1)}</div>
                    <h4 className="font-black text-slate-800 text-xl leading-none">{match.home}</h4>
                    {match.homeName && <p className="text-[10px] font-bold text-slate-400 mt-1 text-center leading-tight px-1">{match.homeName}</p>}
                </div>
                {/* Inputs */}
                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1">
                        <button onClick={() => handleScoreChange('home', 1)} className="w-10 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"><ChevronUp size={20} /></button>
                        <div className="w-12 h-12 flex items-center justify-center bg-white border-2 border-slate-200 rounded-xl shadow-sm"><span className="text-2xl font-black text-slate-800">{tempScores.home}</span></div>
                        <button onClick={() => handleScoreChange('home', -1)} className="w-10 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"><ChevronDown size={20} /></button>
                    </div>
                    <div className="text-slate-300 font-black text-xl pb-1">:</div>
                    <div className="flex flex-col items-center gap-1">
                        <button onClick={() => handleScoreChange('away', 1)} className="w-10 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"><ChevronUp size={20} /></button>
                        <div className="w-12 h-12 flex items-center justify-center bg-white border-2 border-slate-200 rounded-xl shadow-sm"><span className="text-2xl font-black text-slate-800">{tempScores.away}</span></div>
                        <button onClick={() => handleScoreChange('away', -1)} className="w-10 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"><ChevronDown size={20} /></button>
                    </div>
                </div>
                {/* Away */}
                <div className="flex flex-col items-center w-1/3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white mb-2 shadow-sm ${match.awayLogo}`}>{match.away.substring(0,1)}</div>
                    <h4 className="font-black text-slate-800 text-xl leading-none">{match.away}</h4>
                    {match.awayName && <p className="text-[10px] font-bold text-slate-400 mt-1 text-center leading-tight px-1">{match.awayName}</p>}
                </div>
            </div>
            <div className="flex gap-3"><button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50">Cancelar</button><button onClick={onSave} className="flex-[2] py-3 rounded-xl bg-lime-400 font-bold text-sm text-slate-900 hover:bg-lime-500 shadow-lg shadow-lime-200 transition-all">Confirmar</button></div>
        </div>
    </div>
);

// --- MAIN APP COMPONENT ---

export default function App() {
  const [currentView, setCurrentView] = useState('home'); 
  
  // SHARED STATE (Mock Data)
  const [groups, setGroups] = useState([
    { 
        id: 1, 
        name: "Los Galácticos", 
        competition: "Liga Profesional", 
        role: "owner", 
        myRank: 1, 
        myPoints: 120, 
        members: [
            { id: 101, name: "Facundo Contreras", role: "admin", avatar: "FC" }, 
            { id: 102, name: "Julian Alvarez", role: "member", avatar: "JA" },
            { id: 103, name: "Enzo Fernández", role: "member", avatar: "EF" },
            { id: 104, name: "Alexis Mac Allister", role: "member", avatar: "AM" }
        ] 
    },
    { 
        id: 2, 
        name: "Amigos del Fútbol", 
        competition: "Copa Libertadores", 
        role: "admin", 
        myRank: 3, 
        myPoints: 85, 
        members: [
            { id: 201, name: "Dibu Martinez", role: "admin", avatar: "DM" },
            { id: 202, name: "Facundo Contreras", role: "admin", avatar: "FC" }
        ] 
    },
    { 
        id: 3, 
        name: "Oficina FC", 
        competition: "Torneo Verano", 
        role: "member", 
        myRank: 1, 
        myPoints: 42, 
        members: [
            { id: 301, name: "Jefe", role: "admin", avatar: "JE" },
            { id: 302, name: "Facundo Contreras", role: "member", avatar: "FC" }
        ] 
    }
  ]);

  const apiKey = ""; 
  const callGemini = async (prompt) => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error generating content.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "Hubo un error al conectar con la IA.";
    }
  };

  // --- VIEW COMPONENTS ---

  const HomeView = () => {
    const [filter, setFilter] = useState('todos');
    const matches = [
        { id: 1, status: 'upcoming', homeShort: 'DR', awayShort: 'NOB', home: 'Deportivo Riestra', away: 'Newells Old Boys', info: 'HOY', subInfo: '19:00', stadium: 'Estadio Guillermo Laza', color: 'bg-slate-800' },
        { id: 2, status: 'live', homeShort: 'BOC', awayShort: 'RIV', home: 'Boca Juniors', away: 'River Plate', info: '2 - 2', subInfo: "PT 34'", stadium: 'La Bombonera', color: 'bg-blue-900', isLive: true },
        { id: 3, status: 'finished', homeShort: 'RAC', awayShort: 'IND', home: 'Racing Club', away: 'Independiente', info: '1 - 0', subInfo: 'Final', stadium: 'El Cilindro', color: 'bg-sky-500' }
    ];
    const filteredMatches = filter === 'todos' ? matches : matches.filter(m => {
        if (filter === 'en vivo') return m.status === 'live';
        if (filter === 'próximos') return m.status === 'upcoming';
        if (filter === 'finalizados') return m.status === 'finished';
        return true;
    });

    return (
      <div className="space-y-4 no-scrollbar">
        <div className="flex gap-4 overflow-x-auto px-4 -mx-4 no-scrollbar">
          {groups.map(group => (
            <div key={group.id} className="min-w-[280px] bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
               <div className="absolute -right-4 -top-4 w-20 h-20 bg-lime-100 rounded-full opacity-50 blur-xl pointer-events-none"></div>
               <div className="flex justify-between items-start mb-3">
                  <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Temp 2026</span><h3 className="font-bold text-slate-800 text-lg">{group.name}</h3></div>
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100"><Shield size={16} className="text-slate-400" /></div>
               </div>
               <div className="flex gap-3">
                 <div className="flex-1 bg-slate-50 rounded-xl p-2.5 border border-slate-100"><p className="text-[10px] text-slate-400 font-semibold mb-0.5">RANKING</p><p className="text-2xl font-black text-slate-800">#{group.myRank}</p></div>
                 <div className="flex-1 bg-lime-50 rounded-xl p-2.5 border border-lime-100"><p className="text-[10px] text-lime-700 font-semibold mb-0.5">PUNTOS</p><div className="flex items-baseline gap-1"><p className="text-2xl font-black text-lime-700">{group.myPoints}</p><Trophy size={12} className="text-lime-600 mb-1" /></div></div>
               </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-4 no-scrollbar">
           <div className="flex-1 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center h-20">
              <div className="flex items-center gap-1.5 mb-0.5"><TrendingUp size={14} className="text-slate-400" /><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">RANKING</span></div>
              <p className="text-xl font-black text-slate-800 leading-none">#1</p>
           </div>
           <div className="flex-1 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center h-20">
               <div className="flex items-center gap-1.5 mb-0.5"><Clock size={14} className="text-slate-400" /><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">PENDIENTES</span></div>
              <p className="text-xl font-black text-slate-800 leading-none">3</p>
           </div>
           <div className="flex-1 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center h-20">
               <div className="flex items-center gap-1.5 mb-0.5"><Activity size={14} className="text-red-400" /><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">EN VIVO</span></div>
              <p className="text-xl font-black text-red-500 leading-none animate-pulse">1</p>
           </div>
        </div>
        <div className="px-4 pb-4 no-scrollbar space-y-4">
           <div className="flex justify-between items-center"><h3 className="font-bold text-slate-800 text-lg">Próximos Partidos</h3><button className="text-slate-400 hover:text-slate-600 transition-colors"><Activity size={16} /></button></div>
           <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar justify-center">
              {['Todos', 'En vivo', 'Próximos', 'Finalizados'].map((tab) => (
                <button key={tab} onClick={() => setFilter(tab.toLowerCase())} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === tab.toLowerCase() ? 'bg-lime-400 text-slate-900' : 'bg-white border border-slate-200 text-slate-500'}`}>{tab}</button>
              ))}
           </div>
           <div className="space-y-3 no-scrollbar">
              {filteredMatches.map(match => (
                  <div key={match.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                      <div className="p-5">
                          <div className="flex justify-between items-center mb-4">
                              <div className="flex flex-col items-center w-1/3"><div className={`w-12 h-12 ${match.color} rounded-full flex items-center justify-center text-white font-bold mb-2`}>{match.homeShort}</div><p className="text-xs font-bold text-center text-slate-800 leading-tight">{match.home}</p></div>
                              <div className="text-center w-1/3">
                                  {match.isLive ? <div className="flex flex-col items-center"><span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse mb-1">EN VIVO</span><p className="text-2xl font-black text-slate-800 tracking-tighter">{match.info}</p><p className="text-xs font-bold text-red-500 mt-1">{match.subInfo}</p></div> : <><p className="text-xs text-slate-400 font-bold mb-1">{match.info}</p><p className="text-2xl font-black text-slate-800 tracking-tighter">{match.status === 'upcoming' ? 'VS' : match.info}</p><p className="text-xs font-bold text-slate-500 mt-1">{match.subInfo}</p></>}
                              </div>
                              <div className="flex flex-col items-center w-1/3"><div className={`w-12 h-12 ${match.color === 'bg-slate-800' ? 'bg-red-600' : (match.color === 'bg-blue-900' ? 'bg-white border-2 border-red-500 text-red-500' : 'bg-red-700')} rounded-full flex items-center justify-center text-white font-bold mb-2`}>{match.awayShort}</div><p className="text-xs font-bold text-center text-slate-800 leading-tight">{match.away}</p></div>
                          </div>
                          <div className="flex items-center gap-2 justify-center text-slate-400 text-xs"><MapPin size={12} /><span>{match.stadium}</span></div>
                      </div>
                  </div>
              ))}
           </div>
        </div>
      </div>
    );
  };

  const GroupsView = () => {
    const [activeTab, setActiveTab] = useState('create');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [selectedCompetition, setSelectedCompetition] = useState("Liga Profesional Apertura");

    return (
      <div className="px-4 space-y-6 no-scrollbar">
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100">
            <button onClick={() => setActiveTab('create')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'create' ? 'bg-lime-50 text-lime-700 border-b-2 border-lime-400' : 'text-slate-400 hover:text-slate-600'}`}>Crear Grupo</button>
            <button onClick={() => setActiveTab('join')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'join' ? 'bg-lime-50 text-lime-700 border-b-2 border-lime-400' : 'text-slate-400 hover:text-slate-600'}`}>Unirse</button>
          </div>
          <div className="p-5">
            {activeTab === 'create' ? (
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="text" 
                    value={newGroupName} 
                    onChange={(e) => setNewGroupName(e.target.value)} 
                    placeholder="Nombre del nuevo grupo" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select 
                      value={selectedCompetition} 
                      onChange={(e) => setSelectedCompetition(e.target.value)} 
                      className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 text-slate-600"
                    >
                      <option value="Liga Profesional Apertura">Liga Profesional</option>
                      <option value="Copa America">Copa America</option>
                    </select>
                    <Trophy size={16} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none"/>
                  </div>
                  <button className="bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold rounded-xl px-4 shadow-lg shadow-lime-200 transition-all active:scale-95">
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Pegar código" 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
                <button className="bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl px-5 text-sm transition-all active:scale-95">
                  Unirme
                </button>
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-slate-800 font-bold text-lg mb-4 flex items-center gap-2">Mis Grupos <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{groups.length}</span></h3>
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.id} className="group bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${group.role === 'owner' ? 'bg-lime-100 text-lime-700' : 'bg-slate-100 text-slate-600'}`}>
                      {group.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 leading-tight">{group.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Trophy size={12} className="text-slate-400" />
                        <span className="text-xs text-slate-500">{group.competition}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {group.role === 'owner' && <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-full mr-1">OWNER</span>}
                    <button onClick={() => { setSelectedGroup(group); setIsManageModalOpen(true); }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors">
                      <Settings size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {isManageModalOpen && selectedGroup && (
          <div className="absolute inset-0 z-50 flex items-end justify-center no-scrollbar">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsManageModalOpen(false)}></div>
            <div className="bg-white w-full rounded-t-3xl p-6 relative shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90%] overflow-y-auto no-scrollbar">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Gestionar Grupo</label>
                  <h2 className="text-2xl font-black text-slate-800 mt-1 leading-tight">{selectedGroup.name}</h2>
                  <p className="text-xs text-slate-500 font-medium">{selectedGroup.competition}</p>
                </div>
                <button onClick={() => setIsManageModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={20} /></button>
              </div>

              <button className="w-full flex items-center justify-center gap-2 bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold py-3.5 rounded-2xl shadow-lg shadow-lime-200 transition-all active:scale-95 mb-8">
                 <LinkIcon size={18} />
                 Copiar link de invitación
              </button>

              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Miembros ({selectedGroup.members.length})</h3>
                    <button className="text-[10px] font-bold text-lime-600 flex items-center gap-1 hover:underline">
                        <UserPlus size={12} /> Invitar más
                    </button>
                </div>
                <div className="space-y-2">
                  {selectedGroup.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group/member transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                            {member.avatar}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{member.name}</p>
                            <div className="flex items-center gap-1">
                                {member.role === 'admin' && <Shield size={10} className="text-blue-500 fill-blue-500" />}
                                <p className="text-[10px] text-slate-400 font-medium capitalize">{member.role}</p>
                            </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {member.role !== 'admin' && (
                            <button title="Promover a Admin" className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">
                                <Shield size={16} />
                            </button>
                        )}
                        {member.id !== 101 && ( 
                            <button title="Expulsar del grupo" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                <UserMinus size={16} />
                            </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button className="w-full flex items-center justify-center gap-2 text-red-500 font-bold py-3 hover:bg-red-50 rounded-2xl transition-colors">
                    <Trash2 size={18} /> Eliminar Grupo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const StandingsView = () => {
    const [viewMode, setViewMode] = useState('posiciones'); 
    const [activeGroup, setActiveGroup] = useState(groups[1]); 
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const standings = [{ rank: 1, name: "Facundo Contreras", isMe: true, trend: "equal", pred: 4, stats: "0/1/3", points: 1 }, { rank: 2, name: "Julian Alvarez", isMe: false, trend: "up", pred: 4, stats: "0/0/2", points: 0 }];
    const groupStats = { globalRank: 842, totalPoints: 1240, exactGuesses: 45, resultGuesses: 89, avgPoints: 12.5 };
    const awards = [
      { id: 'nostradamus', title: 'Nostradamus', winner: 'Facundo Contreras', desc: 'Mayor cantidad de plenos (12)', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-100' },
      { id: 'bilardista', title: 'Bilardista', winner: 'Julian Alvarez', desc: 'Suma con lo justo. Pocos goles.', icon: Shield, color: 'text-slate-700', bg: 'bg-slate-200' },
      { id: 'racha', title: 'La Racha', winner: 'Leo Messi', desc: '5 fechas sumando seguido', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-100' },
      { id: 'batacazo', title: 'Batacazo', winner: 'Dibu Martinez', desc: 'Único acierto en Boca vs River', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100' },
      { id: 'robin', title: 'Robin Hood', winner: 'Enzo F.', desc: 'Acierta difíciles, erra fáciles', icon: Target, color: 'text-green-600', bg: 'bg-green-100' },
      { id: 'casi', title: 'El "Casi"', winner: 'Alexis Mac Allister', desc: 'Erra por un gol de diferencia', icon: Ruler, color: 'text-blue-500', bg: 'bg-blue-100' },
      { id: 'mufa', title: 'El Mufa', winner: 'Jefe', desc: '3 fechas sin sumar nada', icon: CloudRain, color: 'text-slate-500', bg: 'bg-slate-100' },
    ];

    return (
      <div className="space-y-4 px-4 pb-6 no-scrollbar">
        <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm relative">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-2 mb-1">Seleccion Actual</p>
          <button onClick={() => setIsSelectorOpen(true)} className="w-full bg-slate-50 rounded-lg p-3 flex items-center justify-between hover:bg-slate-100 transition-colors text-left">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm truncate pr-2">
              <Trophy size={16} className="text-lime-600 flex-shrink-0" />
              <span className="truncate">{activeGroup.competition} · {activeGroup.name}</span>
            </div>
            <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
          </button>
        </div>

        {isSelectorOpen && <GroupSelectorModal activeGroup={activeGroup} setActiveGroup={setActiveGroup} onClose={() => setIsSelectorOpen(false)} groups={groups} />}
        
        <div className="bg-slate-100 p-1 rounded-xl flex font-bold text-sm">
          <button onClick={() => setViewMode('posiciones')} className={`flex-1 py-2.5 rounded-lg transition-all ${viewMode === 'posiciones' ? 'bg-lime-400 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>POSICIONES</button>
          <button onClick={() => setViewMode('stats')} className={`flex-1 py-2.5 rounded-lg transition-all ${viewMode === 'stats' ? 'bg-lime-400 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>STATS</button>
        </div>

        {viewMode === 'posiciones' && (
             <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2 flex items-center justify-between">
                <button className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600"><ChevronLeft size={16} /></button>
                <span className="text-sm font-bold text-lime-600 uppercase tracking-wide">Global acumulado</span>
                <button className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600"><ChevronRight size={16} /></button>
            </div>
        )}

        {viewMode === 'posiciones' ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden no-scrollbar">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-800">{activeGroup.name}</span>
              <div className="flex gap-4 text-[10px] font-bold text-slate-400 uppercase text-right">
                <span className="w-8 text-center">Pred</span>
                <span className="w-12 text-center">EX/RE/NA</span>
                <span className="w-6 text-center">Pts</span>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {standings.map((user) => (
                <div key={user.rank} className={`px-4 py-2 flex items-center justify-between ${user.isMe ? 'bg-lime-50 border-l-4 border-lime-400' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold w-4 text-center ${user.isMe ? 'text-lime-700' : 'text-slate-400'}`}>{user.rank}</span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">{user.name} {user.isMe && <Star size={10} className="fill-orange-400 text-orange-400" />}</span>
                  </div>
                  <div className="flex gap-4 items-center text-xs font-medium text-right">
                    <span className="w-8 text-center text-slate-500">{user.pred}</span>
                    <span className="w-12 text-center text-slate-500 tracking-tighter">{user.stats}</span>
                    <span className={`w-6 text-center font-bold ${user.isMe ? 'text-slate-900' : 'text-slate-700'}`}>{user.points}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 no-scrollbar">
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="bg-lime-100 p-2.5 rounded-full mb-2 text-lime-700"><Trophy size={20} /></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ranking Mundial</span>
                <span className="text-3xl font-black text-slate-800 mt-1">#{groupStats.globalRank}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="bg-indigo-100 p-2.5 rounded-full mb-2 text-indigo-600"><Star size={20} className="fill-indigo-600" /></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Puntos Totales</span>
                <span className="text-3xl font-black text-indigo-600 mt-1">{groupStats.totalPoints}</span>
                </div>
            </div>

            <div>
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-3 px-1">Premios y Castigos</h3>
                <div className="grid grid-cols-2 gap-2">
                    {awards.map((award) => (
                        <div key={award.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full">
                            <div className="flex items-start justify-between mb-2">
                                <div className={`${award.bg} p-2 rounded-xl ${award.color}`}>
                                    <award.icon size={18} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{award.title}</span>
                            </div>
                            <div>
                                <p className="font-black text-slate-800 text-sm leading-tight mb-1">{award.winner}</p>
                                <p className="text-[10px] text-slate-500 leading-tight">{award.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                        <BarChart3 size={16} className="text-slate-400" /> 
                        Rendimiento General
                    </h3>
                </div>
                <div className="divide-y divide-slate-50">
                    <StatRow icon={<Target size={16}/>} label="Aciertos Exactos" subLabel="Puntaje máximo" value={groupStats.exactGuesses} color="text-green-700" bg="bg-green-100" />
                    <StatRow icon={<Check size={16}/>} label="Resultados" subLabel="Solo ganador/empate" value={groupStats.resultGuesses} color="text-blue-700" bg="bg-blue-100" />
                    <StatRow icon={<PieChart size={16}/>} label="Promedio x Fecha" subLabel="Por participante" value={groupStats.avgPoints} color="text-orange-700" bg="bg-orange-100" />
                </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const FixtureView = () => {
    const [filter, setFilter] = useState('todos');
    const [activeGroup, setActiveGroup] = useState(groups[0]);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const allMatchesData = [
      { date: "Hoy, 16 de Febrero", matches: [{ id: 10, home: "Boca Juniors", away: "Huracan", homeScore: 1, awayScore: 1, status: "live", info: "PT 34'", isLive: true, homeColor: "bg-blue-900", awayColor: "bg-white border-2 border-red-500" }, { id: 3, home: "Independiente", away: "Lanus", homeScore: 2, awayScore: 0, status: "finished", info: "FINAL", homeColor: "bg-red-700", awayColor: "bg-red-900" }] },
      { date: "Sábado, 21 de Febrero", matches: [{ id: 6, home: "Banfield", away: "Racing Club", homeScore: null, awayScore: null, status: "upcoming", info: "19:00", homeColor: "bg-green-600", awayColor: "bg-sky-400" }, { id: 11, home: "Rosario Central", away: "Newells", homeScore: null, awayScore: null, status: "upcoming", info: "21:30", homeColor: "bg-blue-800 text-yellow-400", awayColor: "bg-red-600" }] },
      { date: "Jueves, 12 de Febrero", matches: [{ id: 1, home: "Tigre", away: "Aldosivi", homeScore: 1, awayScore: 0, status: "finished", info: "FINAL", homeColor: "bg-blue-800", awayColor: "bg-yellow-400 text-green-800" }] }
    ];

    const filteredFixture = allMatchesData.map(day => ({
        ...day,
        matches: day.matches.filter(m => {
            if (filter === 'todos') return true;
            if (filter === 'en vivo') return m.status === 'live';
            if (filter === 'finalizados') return m.status === 'finished';
            if (filter === 'próximos') return m.status === 'upcoming';
            return true;
        })
    })).filter(day => day.matches.length > 0);

    return (
      <div className="space-y-4 px-4 pb-6 no-scrollbar">
        <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm relative">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-2 mb-1">Seleccion Actual</p>
           <button onClick={() => setIsSelectorOpen(true)} className="w-full bg-slate-50 rounded-lg p-3 flex items-center justify-between hover:bg-slate-100 transition-colors text-left">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm truncate pr-2"><Trophy size={16} className="text-lime-600 flex-shrink-0" /> <span className="truncate">{activeGroup.competition} · {activeGroup.name}</span></div>
              <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
           </button>
        </div>
        {isSelectorOpen && <GroupSelectorModal activeGroup={activeGroup} setActiveGroup={setActiveGroup} onClose={() => setIsSelectorOpen(false)} groups={groups} />}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2 flex items-center justify-between">
           <button className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600"><ChevronLeft size={18} /></button>
           <div className="text-center"><h3 className="text-base font-bold text-lime-600">Fecha 5</h3><p className="text-[10px] text-slate-400 font-medium">Actualizado hace instantes</p></div>
           <button className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600"><ChevronRight size={18} /></button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 justify-center">
          {['Todos', 'En vivo', 'Finalizados', 'Próximos'].map((tab) => (
            <button key={tab} onClick={() => setFilter(tab.toLowerCase())} className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border ${filter === tab.toLowerCase() ? 'bg-lime-200 border-lime-300 text-lime-900' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{tab}</button>
          ))}
        </div>
        <div className="space-y-4 no-scrollbar">
           {filteredFixture.map((day, idx) => (
             <div key={idx} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-50"><h4 className="font-bold text-slate-800">{day.date}</h4></div>
                <div className="divide-y divide-slate-50">
                   {day.matches.map(match => (
                      <div key={match.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                         <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${match.homeColor}`}>{match.home.substring(0,1)}</div>
                            <span className="text-xs font-bold text-slate-800 truncate">{match.home}</span>
                         </div>
                         <div className="px-2 text-center flex-shrink-0">
                            {match.isLive ? (<div className="flex flex-col items-center"><span className="text-[8px] font-black text-red-500 animate-pulse bg-red-50 px-1 rounded uppercase mb-0.5 border border-red-100">VIVO</span><span className="text-sm font-black text-slate-800">{match.homeScore} - {match.awayScore}</span><span className="text-[9px] text-red-400 font-bold">{match.info}</span></div>) : (<div className="flex flex-col items-center"><span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">{match.status === 'upcoming' ? 'VS' : 'FINAL'}</span><span className="text-sm font-bold text-slate-800">{match.status === 'upcoming' ? match.info : `${match.homeScore} - ${match.awayScore}`}</span></div>)}
                         </div>
                         <div className="flex items-center justify-end gap-3 flex-1 min-w-0">
                             <span className="text-xs font-bold text-slate-800 text-right truncate">{match.away}</span>
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${match.awayColor}`}>{match.away.substring(0,1)}</div>
                             <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           ))}
           {filteredFixture.length === 0 && <div className="text-center py-12 text-slate-400 text-xs">No hay partidos para mostrar en esta categoría.</div>}
        </div>
      </div>
    );
  };

  const PronosticosView = () => {
    const [activeGroup, setActiveGroup] = useState(groups[0]);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('upcoming'); 
    const [editingMatch, setEditingMatch] = useState(null);
    const [tempScores, setTempScores] = useState({ home: '', away: '' });
    const [pendingMatches, setPendingMatches] = useState([{ id: 1, home: "DEF", homeName: "Defensa y Justicia", away: "BEL", awayName: "Belgrano", date: "19/2", time: "17:15", homeLogo: "bg-yellow-500 text-green-900", awayLogo: "bg-sky-300", homeScore: null, awayScore: null }]);
    const historyMatches = [{ id: 4, home: "BOC", homeName: "Boca Juniors", away: "RIV", awayName: "River Plate", status: "live", info: "PT 34'", homeScore: 1, awayScore: 1, prediction: {h: 2, a: 1}, homeLogo: "bg-blue-900", awayLogo: "bg-white border-2 border-red-500" }];

    const openPredictionModal = (match) => { setEditingMatch(match); setTempScores({ home: match.homeScore !== null ? match.homeScore : '-', away: match.awayScore !== null ? match.awayScore : '-' }); };
    const handleScoreChange = (team, delta) => { setTempScores(prev => { const currentVal = prev[team] === '-' ? 0 : parseInt(prev[team]); return { ...prev, [team]: Math.max(0, currentVal + delta) }; }); };
    const savePrediction = () => { setPendingMatches(prev => prev.map(m => m.id === editingMatch.id ? { ...m, homeScore: tempScores.home === '-' ? null : tempScores.home, awayScore: tempScores.away === '-' ? null : tempScores.away } : m)); setEditingMatch(null); };

    return (
      <div className="space-y-4 px-4 pb-6 no-scrollbar">
        <div className="space-y-3 no-scrollbar">
            <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm relative">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-2 mb-1">Seleccion Actual</p>
                <button onClick={() => setIsSelectorOpen(true)} className="w-full bg-slate-50 rounded-lg p-3 flex items-center justify-between hover:bg-slate-100 transition-colors text-left">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-sm truncate pr-2"><Trophy size={16} className="text-lime-600 flex-shrink-0" /> <span className="truncate">{activeGroup.competition} · {activeGroup.name}</span></div>
                    <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                </button>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2 flex items-center justify-between">
                <button className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600"><ChevronLeft size={16} /></button>
                <div className="text-center"><h3 className="text-base font-bold text-lime-600">Fecha 6</h3><p className="text-[10px] text-slate-400 font-medium">Cierra en 3 días</p></div>
                <button className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600"><ChevronRight size={16} /></button>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm flex-1 mr-2">
                  <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{pendingMatches.filter(m => m.homeScore !== null).length}/15</span>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-lime-500 rounded-full transition-all duration-500" style={{ width: `${(pendingMatches.filter(m => m.homeScore !== null).length / 15) * 100}%` }}></div></div>
                </div>
                <div className="flex bg-slate-100 p-0.5 rounded-lg flex-shrink-0">
                    <button onClick={() => setActiveTab('upcoming')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${activeTab === 'upcoming' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>Por Jugar</button>
                    <button onClick={() => setActiveTab('history')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>Historial</button>
                </div>
            </div>
        </div>
        {isSelectorOpen && <GroupSelectorModal activeGroup={activeGroup} setActiveGroup={setActiveGroup} onClose={() => setIsSelectorOpen(false)} groups={groups} />}
        <div className="space-y-2 no-scrollbar">
            {activeTab === 'upcoming' ? pendingMatches.map(match => (
                <div key={match.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden py-3 px-3 relative group no-scrollbar">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0"><div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${match.homeLogo}`}>{match.home.substring(0,1)}</div><span className="text-lg font-black text-slate-800 truncate">{match.home}</span></div>
                        <button onClick={() => openPredictionModal(match)} className={`flex items-center justify-center px-3 py-1.5 gap-2 mx-1 rounded-lg border transition-all active:scale-95 ${match.homeScore !== null ? 'bg-lime-50 border-lime-200 text-slate-900' : 'bg-slate-50 border-transparent text-slate-300 hover:bg-slate-100'}`}><span className="font-black text-lg w-6 text-center">{match.homeScore !== null ? match.homeScore : '-'}</span><span className="font-black text-lg opacity-20 text-slate-400">:</span><span className="font-black text-lg w-6 text-center">{match.awayScore !== null ? match.awayScore : '-'}</span></button>
                        <div className="flex items-center justify-end gap-2 flex-1 min-w-0"><span className="text-lg font-black text-slate-800 truncate text-right">{match.away}</span><div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${match.awayLogo}`}>{match.away.substring(0,1)}</div></div>
                    </div>
                    <div className="flex justify-center mt-2"><span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{match.date} • {match.time}</span></div>
                </div>
            )) : historyMatches.map(match => (
                <div key={match.id} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden py-3 px-3 opacity-80 no-scrollbar"><div className="flex items-center justify-between"><div className="flex items-center gap-2 flex-1 min-w-0"><div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${match.homeLogo}`}>{match.home.substring(0,1)}</div><span className="text-sm font-bold text-slate-600 truncate">{match.home}</span></div><div className="flex flex-col items-center px-2"><div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200 mb-0.5"><span className="font-black text-sm text-slate-800">{match.homeScore}</span><span className="text-[10px] text-slate-300">-</span><span className="font-black text-sm text-slate-800">{match.awayScore}</span></div><span className="text-[9px] text-slate-400 font-medium">Tú: {match.prediction.h}-{match.prediction.a}</span></div><div className="flex items-center justify-end gap-2 flex-1 min-w-0"><span className="text-sm font-bold text-slate-600 truncate text-right">{match.away}</span><div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${match.awayLogo}`}>{match.away.substring(0,1)}</div></div></div><div className="flex justify-center mt-2 gap-2"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${match.status === 'live' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-200 text-slate-500'}`}>{match.status === 'live' ? 'EN VIVO' : 'FINAL'}</span></div></div>
            ))}
        </div>
        {editingMatch && <PredictionModal match={editingMatch} tempScores={tempScores} handleScoreChange={handleScoreChange} onSave={savePrediction} onCancel={() => setEditingMatch(null)} />}
      </div>
    );
  };

  const ConfigView = () => {
    return (
        <div className="px-4 pb-6 space-y-6 no-scrollbar">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">General</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Moon size={18} /></div>
                            <span className="text-sm font-bold text-slate-800">Modo Oscuro</span>
                        </div>
                        <div className="w-10 h-6 bg-slate-200 rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1 shadow-sm"></div></div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Globe size={18} /></div>
                            <span className="text-sm font-bold text-slate-800">Idioma</span>
                        </div>
                        <span className="text-xs font-bold text-slate-400">Español</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Notificaciones</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Bell size={18} /></div>
                            <span className="text-sm font-bold text-slate-800">Push Notifications</span>
                        </div>
                        <div className="w-10 h-6 bg-lime-400 rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow-sm"></div></div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Smartphone size={18} /></div>
                            <span className="text-sm font-bold text-slate-800">Vibración</span>
                        </div>
                        <div className="w-10 h-6 bg-lime-400 rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow-sm"></div></div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Cuenta</h3>
                <div className="space-y-4">
                    <button className="w-full flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-slate-200 transition-colors"><User size={18} /></div>
                            <span className="text-sm font-bold text-slate-800">Mi Perfil</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-300" />
                    </button>
                    <button className="w-full flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-slate-200 transition-colors"><Lock size={18} /></div>
                            <span className="text-sm font-bold text-slate-800">Cambiar Contraseña</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-300" />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Soporte</h3>
                <div className="space-y-4">
                    <button className="w-full flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-slate-200 transition-colors"><HelpCircle size={18} /></div>
                            <span className="text-sm font-bold text-slate-800">Ayuda y FAQ</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-300" />
                    </button>
                    <button className="w-full flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-slate-200 transition-colors"><FileText size={18} /></div>
                            <span className="text-sm font-bold text-slate-800">Términos y Condiciones</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-300" />
                    </button>
                </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 text-red-500 font-bold py-3 bg-red-50 hover:bg-red-100 rounded-xl transition-colors mt-4">
                <LogOut size={18} /> Cerrar Sesión
            </button>
            
            <div className="text-center mt-4">
                <p className="text-[10px] text-slate-400 font-bold">Fulbito Prode v1.0.2</p>
            </div>
        </div>
    );
  };

  const ProfileView = () => {
    const user = {
        name: "Facundo Contreras",
        username: "@facucontreras",
        email: "facundo@example.com",
        avatar: "FC",
        stats: { totalPoints: 1240, globalRank: 842, accuracy: "68%", groups: 3 },
        recentActivity: [
            { id: 1, type: 'prediction', match: 'Boca vs River', points: 3, date: 'Hace 2h' },
            { id: 2, type: 'group_join', group: 'Los Galácticos', date: 'Ayer' },
            { id: 3, type: 'prediction', match: 'Racing vs Independiente', points: 1, date: 'Hace 2d' }
        ]
    };

    return (
        <div className="px-4 pb-6 space-y-6 no-scrollbar">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-r from-lime-200 to-lime-400 opacity-20"></div>
                <div className="w-24 h-24 bg-lime-100 text-lime-600 rounded-full flex items-center justify-center text-3xl font-black border-4 border-white shadow-md relative z-10 mb-3">
                    {user.avatar}
                    <button className="absolute bottom-0 right-0 p-1.5 bg-slate-800 text-white rounded-full shadow-sm hover:bg-slate-700 transition-colors"><Edit3 size={12} /></button>
                </div>
                <h2 className="text-xl font-black text-slate-800">{user.name}</h2>
                <p className="text-sm text-slate-400 font-medium mb-4">{user.username}</p>
                <button className="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-colors">Editar Perfil</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><div className="flex items-center gap-2 mb-2 text-slate-400"><Trophy size={16} /><span className="text-xs font-bold uppercase">Puntos</span></div><p className="text-2xl font-black text-slate-800">{user.stats.totalPoints}</p></div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><div className="flex items-center gap-2 mb-2 text-slate-400"><TrendingUp size={16} /><span className="text-xs font-bold uppercase">Ranking</span></div><p className="text-2xl font-black text-slate-800">#{user.stats.globalRank}</p></div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><div className="flex items-center gap-2 mb-2 text-slate-400"><Target size={16} /><span className="text-xs font-bold uppercase">Precisión</span></div><p className="text-2xl font-black text-slate-800">{user.stats.accuracy}</p></div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><div className="flex items-center gap-2 mb-2 text-slate-400"><Users size={16} /><span className="text-xs font-bold uppercase">Grupos</span></div><p className="text-2xl font-black text-slate-800">{user.stats.groups}</p></div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-800 text-sm">Actividad Reciente</h3></div>
                <div className="divide-y divide-slate-50">
                    {user.recentActivity.map(activity => (
                        <div key={activity.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                            <div className={`p-2 rounded-full ${activity.type === 'prediction' ? 'bg-indigo-50 text-indigo-500' : 'bg-lime-50 text-lime-600'}`}>{activity.type === 'prediction' ? <Activity size={16} /> : <Users size={16} />}</div>
                            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-800 truncate">{activity.type === 'prediction' ? `Pronóstico: ${activity.match}` : `Te uniste a ${activity.group}`}</p><p className="text-[10px] text-slate-400">{activity.date}</p></div>
                            {activity.points && <span className="text-xs font-bold text-lime-600">+{activity.points} pts</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const getHeaderProps = () => {
    switch(currentView) {
      case 'home': return { title: 'Inicio', subtitle: 'Tablero general', icon: Home };
      case 'groups': return { title: 'Grupos', subtitle: 'Gestión social', icon: Users };
      case 'standings': return { title: 'Posiciones', subtitle: 'Rendimiento del grupo', icon: List };
      case 'fixture': return { title: 'Fixture', subtitle: 'Partidos por fecha', icon: CalendarDays };
      case 'pronosticos': return { title: 'Pronósticos', subtitle: 'Resultados y carga', icon: Activity };
      case 'config': return { title: 'Configuración', subtitle: 'Ajustes de la cuenta', icon: Settings };
      case 'profile': return { title: 'Perfil', subtitle: 'Estadísticas y actividad', icon: User };
      default: return { title: 'App', subtitle: '', icon: null };
    }
  };

  return (
    <div className="bg-slate-200 min-h-screen flex justify-center items-start sm:py-6 font-sans">
      <GlobalStyles />
      <div className="w-full max-w-md bg-slate-50 min-h-screen sm:min-h-[850px] sm:h-[850px] sm:rounded-[32px] shadow-2xl relative overflow-hidden sm:border-[8px] sm:border-slate-900 ring-4 ring-black/5 flex flex-col no-scrollbar">
        <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
          <Header {...getHeaderProps()} onConfigClick={() => setCurrentView('config')} onProfileClick={() => setCurrentView('profile')} />
          <main className="mt-6 no-scrollbar">
            {currentView === 'home' && <HomeView />}
            {currentView === 'groups' && <GroupsView />}
            {currentView === 'standings' && <StandingsView />}
            {currentView === 'fixture' && <FixtureView />}
            {currentView === 'pronosticos' && <PronosticosView />}
            {currentView === 'config' && <ConfigView />}
            {currentView === 'profile' && <ProfileView />}
          </main>
        </div>
        <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 pb-6 flex justify-between items-center z-40 no-scrollbar">
          <NavIcon icon={<Home size={22} />} label="Inicio" isActive={currentView === 'home'} onClick={() => setCurrentView('home')} />
          <NavIcon icon={<List size={22} />} label="Posiciones" isActive={currentView === 'standings'} onClick={() => setCurrentView('standings')} />
          <NavIcon icon={<Activity size={22} />} label="Pronósticos" isActive={currentView === 'pronosticos'} onClick={() => setCurrentView('pronosticos')} />
          <NavIcon icon={<CalendarDays size={22} />} label="Fixture" isActive={currentView === 'fixture'} onClick={() => setCurrentView('fixture')} />
          <NavIcon icon={<Users size={22} />} label="Grupos" isActive={currentView === 'groups'} onClick={() => setCurrentView('groups')} />
        </nav>
      </div>
    </div>
  );
}