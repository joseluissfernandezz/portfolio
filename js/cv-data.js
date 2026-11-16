/* Fuente única del CV: la usan el modo texto y el juego 3D. */
window.CV_DATA = {
  es: {
    name: 'José Luis Fernández Solís',
    role: 'Java Backend Developer',
    location: 'Sabadell, Barcelona',
    email: 'joseluiscanrull@gmail.com',
    linkedin: 'linkedin.com/in/joseluisfernandezsolis',
    summary: 'Desarrollador backend (Java y SQL) con 2 años de experiencia. Trabajador, detallista y con facilidad para aprender. Actualmente desarrollo un ERP contable y fiscal, con modelos tributarios validados con las herramientas oficiales.',
    labels: {
      experience: 'Experiencia', education: 'Formación', skills: 'Stack técnico', languages: 'Idiomas',
      soft: 'Competencias', extra: 'Información adicional', contact: 'Contacto', profile: 'Perfil'
    },
    experience: [
      { role: 'Desarrollador Backend', org: 'Geyce Software', date: 'Ene 2026 — Actualidad', short: 'Geyce Software',
        points: ['Desarrollo backend en Java para un ERP contable y fiscal.', 'Modelos tributarios estatales y forales validados con las herramientas oficiales.', 'Consultas y optimización en SQL Server mediante JDBC.', 'Informes con JasperReports; control de versiones con Git y SVN.', 'Equipo SCRUM; desarrollo diario asistido por IA con Claude.'] },
      { role: 'Desarrollador Backend', org: 'MGA Games', date: 'Jun 2024 — Jun 2025 (1 año)', short: 'MGA Games',
        points: ['Depuración y resolución de incidencias backend en Java.', 'Escritura y optimización de consultas SQL para la gestión de premios.', 'Documentación técnica e integración continua.', 'Pruebas para garantizar el rendimiento y la estabilidad.'] },
      { role: 'Técnico informático', org: 'Escola Creu Alta', date: 'Nov 2022 — Abr 2023', short: 'Técnico IT', points: [] },
      { role: 'Técnico informático', org: 'Institut Jonqueres', date: 'Oct 2021 — Feb 2022', short: 'Técnico IT', points: [] }
    ],
    education: [
      { title: 'CFGS DAMvi', org: 'Desarrollo de Aplicaciones Multiplataforma, perfil Videojuegos y Ocio Digital', date: 'Sep 2023 — Jun 2025' },
      { title: 'CFGM SMX', org: 'Sistemas Microinformáticos y Redes', date: 'Sep 2020 — May 2023' }
    ],
    skills: [
      { group: 'Backend', items: ['Java', 'Spring Boot', 'JDBC', 'Hibernate'] },
      { group: 'Bases de datos', items: ['SQL', 'SQL Server', 'MongoDB'] },
      { group: 'Herramientas', items: ['Git', 'SVN', 'JasperReports', 'SCRUM', 'Claude (IA)'] },
      { group: 'También', items: ['JavaScript', 'React', 'Angular', 'Python', 'C#', 'PHP'] }
    ],
    languages: [['Español', 'Nativo'], ['Catalán', 'Nativo'], ['Inglés', 'Competencia profesional']],
    soft: ['Resolución de problemas', 'Pensamiento analítico', 'Atención al detalle', 'Trabajo en equipo', 'Aprendizaje rápido'],
    extra: ['Desarrollo diario asistido por IA', 'Carnet de conducir']
  },

  en: {
    name: 'José Luis Fernández Solís',
    role: 'Java Backend Developer',
    location: 'Sabadell, Barcelona (Spain)',
    email: 'joseluiscanrull@gmail.com',
    linkedin: 'linkedin.com/in/joseluisfernandezsolis',
    summary: 'Backend developer (Java & SQL) with 2 years of experience. Hard-working, detail-oriented and a fast learner. I currently build an accounting and tax ERP, with tax forms validated against the official tools.',
    labels: {
      experience: 'Experience', education: 'Education', skills: 'Tech stack', languages: 'Languages',
      soft: 'Strengths', extra: 'Additional information', contact: 'Contact', profile: 'Profile'
    },
    experience: [
      { role: 'Backend Developer', org: 'Geyce Software', date: 'Jan 2026 — Present', short: 'Geyce Software',
        points: ['Java backend development for an accounting and tax ERP.', 'State and regional tax forms validated with the official tools.', 'SQL queries and optimisation on SQL Server using JDBC.', 'Reports with JasperReports; version control with Git and SVN.', 'SCRUM team; daily AI-assisted development with Claude.'] },
      { role: 'Backend Developer', org: 'MGA Games', date: 'Jun 2024 — Jun 2025 (1 year)', short: 'MGA Games',
        points: ['Debugging and fixing backend issues in Java.', 'Writing and optimising SQL queries for prize management.', 'Technical documentation and continuous integration.', 'Testing to guarantee performance and stability.'] },
      { role: 'IT Technician', org: 'Escola Creu Alta', date: 'Nov 2022 — Apr 2023', short: 'IT Technician', points: [] },
      { role: 'IT Technician', org: 'Institut Jonqueres', date: 'Oct 2021 — Feb 2022', short: 'IT Technician', points: [] }
    ],
    education: [
      { title: 'CFGS DAMvi', org: 'Multiplatform Application Development for Video Games and Digital Entertainment', date: 'Sep 2023 — Jun 2025' },
      { title: 'CFGM SMX', org: 'Microcomputer Systems and Networks', date: 'Sep 2020 — May 2023' }
    ],
    skills: [
      { group: 'Backend', items: ['Java', 'Spring Boot', 'JDBC', 'Hibernate'] },
      { group: 'Databases', items: ['SQL', 'SQL Server', 'MongoDB'] },
      { group: 'Tools', items: ['Git', 'SVN', 'JasperReports', 'SCRUM', 'Claude (AI)'] },
      { group: 'Also', items: ['JavaScript', 'React', 'Angular', 'Python', 'C#', 'PHP'] }
    ],
    languages: [['Spanish', 'Native'], ['Catalan', 'Native'], ['English', 'Professional working proficiency']],
    soft: ['Problem solving', 'Analytical thinking', 'Attention to detail', 'Teamwork', 'Fast learner'],
    extra: ['Daily AI-assisted development', 'Driving licence']
  }
};

/* Textos de la interfaz de la página del CV */
window.CV_UI = {
  es: {
    back: 'Portfolio', text: 'Texto', game: 'Interactivo 3D', print: 'Imprimir / PDF',
    intro_title: 'Recorre mi trayectoria',
    intro_text: 'Camina por el mundo y acércate a cada estación para leer una parte de mi CV. Recoge los orbes de tecnologías por el camino.',
    intro_keys: 'WASD / flechas para moverte', intro_touch: 'Joystick en pantalla táctil', intro_auto: '«Siguiente» para ir solo',
    start: 'Empezar', sections: 'Secciones', orbs: 'Skills', next: 'Siguiente', prev: 'Anterior', exit: 'Salir',
    hint: 'Acércate a una estación para leerla',
    got: 'Skill desbloqueada', end_title: '¡Has recorrido mi CV!',
    end_text: 'Gracias por jugar. Si encajo en tu equipo, hablemos.',
    end_contact: 'Contactar', end_text_btn: 'Ver en texto', end_replay: 'Volver a jugar',
    nowebgl: 'Tu navegador no soporta WebGL. Te muestro el CV en texto.',
    loading: 'Cargando mundo 3D…'
  },
  en: {
    back: 'Portfolio', text: 'Text', game: '3D interactive', print: 'Print / PDF',
    intro_title: 'Walk through my career',
    intro_text: 'Walk around the world and approach each station to read part of my CV. Collect the technology orbs along the way.',
    intro_keys: 'WASD / arrow keys to move', intro_touch: 'On-screen joystick on touch', intro_auto: '“Next” to auto-walk',
    start: 'Start', sections: 'Sections', orbs: 'Skills', next: 'Next', prev: 'Previous', exit: 'Exit',
    hint: 'Walk up to a station to read it',
    got: 'Skill unlocked', end_title: 'You walked through my CV!',
    end_text: 'Thanks for playing. If I fit your team, let\'s talk.',
    end_contact: 'Contact me', end_text_btn: 'View as text', end_replay: 'Play again',
    nowebgl: 'Your browser doesn\'t support WebGL. Showing the text CV instead.',
    loading: 'Loading 3D world…'
  }
};
