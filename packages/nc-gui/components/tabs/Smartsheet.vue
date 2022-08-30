<script setup lang="ts">
import type { ColumnType, TableType, ViewType } from 'nocodb-sdk'
import { onBeforeUnmount, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import SmartsheetGrid from '../smartsheet/Grid.vue'
import {
  ActiveViewInj,
  FieldsInj,
  IsFormInj,
  IsLockedInj,
  MetaInj,
  OpenNewRecordFormHookInj,
  ReloadViewDataHookInj,
  computed,
  inject,
  provide,
  provideSidebar,
  useMetas,
  useProvideSmartsheetStore,
  useUIPermission,
  watch,
} from '#imports'
import type { TabItem } from '~/composables'

const { activeTab } = defineProps<{
  activeTab: TabItem
}>()

const { metas } = useMetas()

const activeView = ref()

const el = ref<typeof SmartsheetGrid>()

const fields = ref<ColumnType[]>([])

provide(TabMetaInj, ref(activeTab))
const meta = computed<TableType>(() => metas.value?.[activeTab?.id as string])

const reloadEventHook = createEventHook<void>()
const openNewRecordFormHook = createEventHook<void>()

const { isUIAllowed } = useUIPermission()
const { isGallery, isGrid, isForm, isLocked } = useProvideSmartsheetStore(activeView, meta)
const {isUIAllowed} = useUIPermission()

const { isGallery, isGrid, isForm, isLocked, nestedFilters, sorts } = useProvideSmartsheetStore(
  activeView as Ref<TableType>,
  meta,
)


const id = Math.floor(1000 * Math.random())

watch(
  activeView,
  (newView: ViewType) => {
    if (!newView || !tabMeta.value?.state?.get(newView.id as string)) {
      return
    }

    console.log(id, 'watch', newView.id)

    if (
      tabMeta.value?.state?.get(newView.id as string)?.has('filters') &&
      !isUIAllowed('filterSync') &&
      !isUIAllowed('filterChildrenRead')
    ) {
      nestedFilters.value = tabMeta.value?.state?.get(newView.id as string)?.get('filters') || []
    }
    if (tabMeta.value?.state?.get(newView.id as string)?.has('sorts') && !isUIAllowed('sortSync')) {
      nestedFilters.value = tabMeta.value?.state?.get(newView.id as string)?.get('sorts') || []
    }
  },
  { immediate: true },
)

/** keep view level state in tabMeta and restore on view change */
const stopFilterWatch = watch(nestedFilters, (newFilters) => {
  tabMeta.value.state = tabMeta.value.state || new Map()
  if (!tabMeta.value.state.has(activeView.value.id)) {
    tabMeta.value.state.set(activeView.value.id, new Map())
  }
  tabMeta.value.state.get(activeView.value.id)!.set('filters', newFilters)
})

watch(sorts, (newSorts) => {
  tabMeta.value.state = tabMeta.value.state || new Map()
  if (!tabMeta.value.state.has(activeView.value.id)) {
    tabMeta.value.state.set(activeView.value.id, new Map())
  }
  tabMeta.value.state.get(activeView.value.id)!.set('sorts', newSorts)
})

onBeforeUnmount(() => {
  stopFilterWatch()
  stopSortWatch()
})

// provide the sidebar injection state
provideSidebar('nc-right-sidebar', { useStorage: true, isOpen: true })

// todo: move to store
provide(MetaInj, meta)
provide(ActiveViewInj, activeView)
provide(IsLockedInj, isLocked)
provide(ReloadViewDataHookInj, reloadEventHook)
provide(OpenNewRecordFormHookInj, openNewRecordFormHook)
provide(FieldsInj, fields)
provide(IsFormInj, isForm)

const treeViewIsLockedInj = inject('TreeViewIsLockedInj', ref(false))

watch(isLocked, (nextValue) => (treeViewIsLockedInj.value = nextValue), { immediate: true })
</script>

<template>
  <div class="nc-container flex h-full">
    <div class="flex flex-col h-full flex-1 min-w-0">
      <SmartsheetToolbar />

      <template v-if="meta">
        <div class="flex flex-1 min-h-0">
          <div v-if="activeView" class="h-full flex-1 min-w-0 min-h-0 bg-gray-50">
            <SmartsheetGrid v-if="isGrid" :ref="el" />

            <SmartsheetGallery v-else-if="isGallery" />

            <SmartsheetForm v-else-if="isForm" />
          </div>
        </div>
      </template>
    </div>
    <SmartsheetSidebar v-if="meta" class="nc-right-sidebar" />
  </div>
</template>

<style scoped>
:deep(.nc-right-sidebar.ant-layout-sider-collapsed) {
  @apply !w-0 !max-w-0 !min-w-0 overflow-x-hidden;
}
</style>
