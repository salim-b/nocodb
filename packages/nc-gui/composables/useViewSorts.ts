import { ViewType } from 'nocodb-sdk'
import type { GalleryType, GridType, KanbanType, SortType } from 'nocodb-sdk'
import type { Ref } from 'vue'
import { message } from 'ant-design-vue'
import { IsPublicInj, ReloadViewDataHookInj, extractSdkResponseErrorMsg, useNuxtApp } from '#imports'
import { TabItem } from '~/composables/useTabs'
import { TabMetaInj } from '~/context'

export function useViewSorts(view: Ref<ViewType | undefined>, reloadData?: () => void) {
  const { sharedView } = useSharedView()
  const { sorts } = useSmartsheetStoreOrThrow()

  const reloadHook = inject(ReloadViewDataHookInj)

  const isPublic = inject(IsPublicInj, ref(false))

  const { $api, $e } = useNuxtApp()

  const { isUIAllowed } = useUIPermission()
  const { isSharedBase } = useProject()

  const tabMeta = inject(TabMetaInj, ref({ sortsState: new Map() } as TabItem))

  const loadSorts = async () => {
    if (isPublic.value) {
      // todo: sorts missing on `ViewType`
      const sharedSorts = (sharedView.value as any)?.sorts || []
      sorts.value = [...sharedSorts]
      return
    }

    try {
      if (!isUIAllowed('sortSync')) {
        const sortsBackup = tabMeta.value.sortsState.get(view.value.id!)
        if (sortsBackup) {
          sorts.value = sortsBackup
          return
        }
      }
      if (!view?.value) return
      sorts.value = (await $api.dbTableSort.list(view.value!.id!)).sorts?.list || []
    } catch (e: any) {
      console.error(e)
      message.error(await extractSdkResponseErrorMsg(e))
    }
  }

  const saveOrUpdate = async (sort: SortType, i: number) => {
    if (isPublic.value || isSharedBase.value) {
      sorts.value[i] = sort
      sorts.value = [...sorts.value]
      tabMeta.value.sortsState.set(view.value.id!, sorts.value)
      return
    }

    try {
      if (isUIAllowed('sortSync')) {
        if (sort.id) {
          await $api.dbTableSort.update(sort.id, sort)
          $e('sort-updated')
        } else {
          sorts.value[i] = (await $api.dbTableSort.create(view.value?.id as string, sort)) as unknown as SortType
        }
      }
      reloadData?.()
      $e('a:sort:dir', { direction: sort.direction })
    } catch (e: any) {
      console.error(e)
      message.error(await extractSdkResponseErrorMsg(e))
    }
  }
  const addSort = () => {
    sorts.value = [
      ...sorts.value,
      {
        direction: 'asc',
      },
    ]

    $e('a:sort:add', { length: sorts?.value?.length })

    tabMeta.value.sortsState.set(view.value.id!, sorts.value)
  }

  const deleteSort = async (sort: SortType, i: number) => {
    try {
      if (isUIAllowed('sortSync') && sort.id && !isPublic.value && !isSharedBase.value) {
        await $api.dbTableSort.delete(sort.id)
      }
      sorts.value.splice(i, 1)
      sorts.value = [...sorts.value]

      tabMeta.value.sortsState.set(view.value.id!, sorts.value)

      $e('a:sort:delete')
    } catch (e: any) {
      console.error(e)
      message.error(await extractSdkResponseErrorMsg(e))
    }
  }

  watch(sorts, () => {
    reloadHook?.trigger()
  })


  // watch(
  //   activeView,
  //   (newView: ViewType) => {
  //     if (!newView || !tabMeta.value?.state?.get(newView.id as string)) {
  //       return
  //     }
  //
  //     console.log(id, 'watch', newView.id)
  //
  //     if (
  //       tabMeta.value?.state?.get(newView.id as string)?.has('filters') &&
  //       !isUIAllowed('filterSync') &&
  //       !isUIAllowed('filterChildrenRead')
  //     ) {
  //       nestedFilters.value = tabMeta.value?.state?.get(newView.id as string)?.get('filters') || []
  //     }
  //     if (tabMeta.value?.state?.get(newView.id as string)?.has('sorts') && !isUIAllowed('sortSync')) {
  //       nestedFilters.value = tabMeta.value?.state?.get(newView.id as string)?.get('sorts') || []
  //     }
  //   },
  //   { immediate: true },
  // )
  //
  // /** keep view level state in tabMeta and restore on view change */
  // const stopFilterWatch = watch(nestedFilters, (newFilters) => {
  //   tabMeta.value.state = tabMeta.value.state || new Map()
  //   if (!tabMeta.value.state.has(activeView.value.id)) {
  //     tabMeta.value.state.set(activeView.value.id, new Map())
  //   }
  //   tabMeta.value.state.get(activeView.value.id)!.set('filters', newFilters)
  // })
  //
  // const stopSortWatch = watch(sorts, (newSorts) => {
  //
  //   console.log(id, 'watch-sorts', activeView.value.id, newSorts)
  //   tabMeta.value.state = tabMeta.value.state || new Map()
  //   if (!tabMeta.value.state.has(activeView.value.id)) {
  //     tabMeta.value.state.set(activeView.value.id, new Map())
  //   }
  //   tabMeta.value.state.get(activeView.value.id)!.set('sorts', newSorts)
  // })


  return { sorts, loadSorts, addSort, deleteSort, saveOrUpdate }
}
