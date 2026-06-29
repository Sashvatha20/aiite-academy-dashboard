import api from './axiosInstance';

const normalizeBatch = (b = {}) => ({
  ...b,

  id: b.id,
  batch_id: b.batch_id ?? b.id,

  batch_name: b.batch_name ?? b.batchname ?? '',
  batchname: b.batchname ?? b.batch_name ?? '',

  course_id: b.course_id ?? b.courseid ?? '',
  courseid: b.courseid ?? b.course_id ?? '',

  course_name: b.course_name ?? b.coursename ?? '',
  coursename: b.coursename ?? b.course_name ?? '',

  batch_start_date: b.batch_start_date ?? b.batchstartdate ?? '',
  batchstartdate: b.batchstartdate ?? b.batch_start_date ?? '',

  batch_end_date: b.batch_end_date ?? b.batchenddate ?? '',
  batchenddate: b.batchenddate ?? b.batch_end_date ?? '',

  weekday_weekend: b.weekday_weekend ?? b.weekdayweekend ?? '',
  weekdayweekend: b.weekdayweekend ?? b.weekday_weekend ?? '',

  session_type: b.session_type ?? b.sessiontype ?? '',
  sessiontype: b.sessiontype ?? b.session_type ?? '',

  trainer_ids: b.trainer_ids ?? b.trainerids ?? [],
  trainerids: b.trainerids ?? b.trainer_ids ?? [],

  student_count: b.student_count ?? b.studentcount ?? 0,
  studentcount: b.studentcount ?? b.student_count ?? 0,

  created_at: b.created_at ?? b.createdat ?? null,
  createdat: b.createdat ?? b.created_at ?? null,

  updated_at: b.updated_at ?? b.updatedat ?? null,
  updatedat: b.updatedat ?? b.updated_at ?? null,
});

const normalizeProgress = (p = {}) => ({
  ...p,

  progress_date: p.progress_date ?? p.progressdate ?? '',
  progressdate: p.progressdate ?? p.progress_date ?? '',

  last_topic_covered: p.last_topic_covered ?? p.lasttopiccovered ?? '',
  lasttopiccovered: p.lasttopiccovered ?? p.last_topic_covered ?? '',

  session_hours: p.session_hours ?? p.sessionhours ?? '',
  sessionhours: p.sessionhours ?? p.session_hours ?? '',

  phase_completion_date: p.phase_completion_date ?? p.phasecompletiondate ?? '',
  phasecompletiondate: p.phasecompletiondate ?? p.phase_completion_date ?? '',

  next_phase_start_date: p.next_phase_start_date ?? p.nextphasestartdate ?? '',
  nextphasestartdate: p.nextphasestartdate ?? p.next_phase_start_date ?? '',

  created_at: p.created_at ?? p.createdat ?? null,
  createdat: p.createdat ?? p.created_at ?? null,

  updated_at: p.updated_at ?? p.updatedat ?? null,
  updatedat: p.updatedat ?? p.updated_at ?? null,
});

export const getBatches = async (params) => {
  const res = await api.get('/batches', { params });

  return {
    ...res,
    data: {
      ...res.data,
      batches: Array.isArray(res?.data?.batches)
        ? res.data.batches.map(normalizeBatch)
        : [],
    },
  };
};

export const getBatch = async (id) => {
  const res = await api.get(`/batches/${id}`);

  return {
    ...res,
    data: {
      ...res.data,
      batch: res?.data?.batch ? normalizeBatch(res.data.batch) : null,
    },
  };
};

export const createBatch = (data) => api.post('/batches', data);

export const updateBatch = (id, data) => api.put(`/batches/${id}`, data);

export const deleteBatch = (id) => api.delete(`/batches/${id}`);

export const getBatchProgress = async (id) => {
  const res = await api.get(`/batches/${id}/progress`);

  return {
    ...res,
    data: {
      ...res.data,
      progress: Array.isArray(res?.data?.progress)
        ? res.data.progress.map(normalizeProgress)
        : [],
    },
  };
};

export const addProgress = (id, data) => api.post(`/batches/${id}/progress`, data);

export const updateProgress = (id, pid, data) =>
  api.put(`/batches/${id}/progress/${pid}`, data);

export const syncBatchesSheet = () => api.post('/sheets-sync/batches');

export const syncBatchProgressSheet = () => api.post('/sheets-sync/batch-progress');