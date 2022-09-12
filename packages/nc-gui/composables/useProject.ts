import type { MaybeRef } from '@vueuse/core'
import type { BaseType, OracleUi, ProjectType, TableType } from 'nocodb-sdk'
import { SqlUiFactory } from 'nocodb-sdk'
import { isString } from '@vueuse/core'
import {
  computed,
  createEventHook,
  ref,
  useApi,
  useGlobal,
  useInjectionState,
  useNuxtApp,
  useRoles,
  useRoute,
  useTheme,
  watch,
} from '#imports'
import type { ProjectMetaInfo } from '~/lib'
import type { ThemeConfig } from '@/composables/useTheme'

const [setup, use] = useInjectionState((_projectId?: MaybeRef<string>) => {
  const { $e } = useNuxtApp()

  const { api, isLoading } = useApi()

  const route = useRoute()

  const { includeM2M } = useGlobal()

  const { setTheme, theme } = useTheme()

  const { projectRoles, loadProjectRoles } = useRoles()

  const projectLoadedHook = createEventHook<ProjectType>()

  const project = ref<ProjectType>({})
  const bases = computed<BaseType[]>(() => project.value?.bases || [])
  const tables = ref<TableType[]>([])

  const projectMetaInfo = ref<ProjectMetaInfo | undefined>()

  const projectId = computed(() => (_projectId ? unref(_projectId) : (route.params.projectId as string)))

  // todo: refactor path param name and variable name
  const projectType = $computed(() => route.params.projectType as string)

  const projectMeta = computed<Record<string, any>>(() => {
    try {
      return isString(project.value.meta) ? JSON.parse(project.value.meta) : project.value.meta
    } catch (e) {
      return {}
    }
  })

  const sqlUis = computed(() => {
    const temp: Record<string, any> = {}
    for (const base of bases.value) {
      if (base.id) {
        temp[base.id] = SqlUiFactory.create({ client: base.type }) as Exclude<
          ReturnType<typeof SqlUiFactory['create']>,
          typeof OracleUi
        >
      }
    }
    return temp
  })

  function getBaseType(baseId: string) {
    return bases.value.find((base) => base.id === baseId)?.type || 'mysql2'
  }

  function isMysql(baseId: string) {
    return ['mysql', 'mysql2'].includes(getBaseType(baseId))
  }

  function isMssql(baseId: string) {
    return getBaseType(baseId) === 'mssql'
  }

  function isPg(baseId: string) {
    return getBaseType(baseId) === 'pg'
  }

  const isSharedBase = computed(() => projectType === 'base')

  const router = useRouter()

  async function loadProjectMetaInfo(force?: boolean) {
    if (!projectMetaInfo.value || force) {
      projectMetaInfo.value = await api.project.metaGet(project.value.id!, {}, {})
    }
  }

  async function loadTables() {
    if (project.value.id) {
      const tablesResponse = await api.dbTable.list(project.value.id, {
        includeM2M: includeM2M.value,
      })

      if (tablesResponse.list) tables.value = tablesResponse.list
    }
  }

  async function loadProject(id?: string) {
    if (id) {
      project.value = await api.project.read(projectId.value)
    } else if (projectType === 'base') {
      try {
        const baseData = await api.public.sharedBaseGet(route.params.projectId as string)
        project.value = await api.project.read(baseData.project_id!)
      } catch (e: any) {
        if (e?.response?.status === 404) {
          return router.push('/error/404')
        }
        throw e
      }
    } else if (projectId.value) {
      project.value = await api.project.read(projectId.value)
    } else {
      return
    }

    await loadProjectRoles(
      project.value.id || (route.params.projectId as string),
      isSharedBase.value,
      route.params.projectId as string,
    )

    await loadTables()

    setTheme(projectMeta.value?.theme)

    projectLoadedHook.trigger(project.value)
  }

  async function updateProject(data: Partial<ProjectType>) {
    if (projectType === 'base') {
      return
    }
    if (data.meta && typeof data.meta === 'string') {
      await api.project.update(projectId.value, data)
    } else {
      await api.project.update(projectId.value, { ...data, meta: JSON.stringify(data.meta) })
    }
  }

  async function saveTheme(_theme: Partial<ThemeConfig>) {
    const fullTheme = {
      primaryColor: theme.value.primaryColor,
      accentColor: theme.value.accentColor,
      ..._theme,
    }

    await updateProject({
      color: fullTheme.primaryColor,
      meta: {
        ...projectMeta.value,
        theme: fullTheme,
      },
    })

    setTheme(fullTheme)

    $e('c:themes:change')
  }

  watch(
    () => route.params,
    (next) => {
      if (!next.projectId) {
        setTheme()
      }
    },
  )

  const reset = () => {
    project.value = {}
    tables.value = []
    projectMetaInfo.value = undefined
    projectRoles.value = {}
  }

  return {
    project,
    bases,
    tables,
    loadProjectRoles,
    loadProject,
    updateProject,
    loadTables,
    isMysql,
    isMssql,
    isPg,
    sqlUis,
    isSharedBase,
    loadProjectMetaInfo,
    projectMetaInfo,
    projectMeta,
    saveTheme,
    projectLoadedHook: projectLoadedHook.on,
    reset,
    isLoading,
  }
}, 'useProject')

export const provideProject = setup

export function useProject(projectId?: MaybeRef<string>) {
  const state = use()

  if (!state) {
    return setup(projectId)
  }

  return state
}
