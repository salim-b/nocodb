import { Modal, message } from 'ant-design-vue'
import type { LinkToAnotherRecordType, TableType } from 'nocodb-sdk'
import { UITypes } from 'nocodb-sdk'
import { useI18n } from 'vue-i18n'
import { useNuxtApp } from '#app'
import { TabType } from '~/composables/useTabs'
import { SYSTEM_COLUMNS, extractSdkResponseErrorMsg, useProject } from '#imports'

export function useTable(onTableCreate?: (tableMeta: TableType) => void, baseId?: string) {
  const table = reactive<{ title: string; table_name: string; columns: string[] }>({
    title: '',
    table_name: '',
    columns: SYSTEM_COLUMNS,
  })
  const { t } = useI18n()
  const { $e, $api } = useNuxtApp()
  const { getMeta, removeMeta } = useMetas()
  const { loadTables } = useProject()
  const { closeTab } = useTabs()
  const { sqlUis, project, tables } = useProject()

  const sqlUi = computed(() => (baseId && sqlUis.value[baseId] ? sqlUis.value[baseId] : Object.values(sqlUis.value)[0]))

  const createTable = async () => {
    if (!sqlUi?.value) return
    const columns = sqlUi?.value?.getNewTableColumns().filter((col) => {
      if (col.column_name === 'id' && table.columns.includes('id_ag')) {
        Object.assign(col, sqlUi?.value?.getDataTypeForUiType({ uidt: UITypes.ID }, 'AG'))
        col.dtxp = sqlUi?.value?.getDefaultLengthForDatatype(col.dt)
        col.dtxs = sqlUi?.value?.getDefaultScaleForDatatype(col.dt)
        return true
      }
      return table.columns.includes(col.column_name)
    })

    try {
      const tableMeta = await $api.base.tableCreate(project?.value?.id as string, baseId as string, {
        ...table,
        columns,
      })
      $e('a:table:create')
      onTableCreate?.(tableMeta)
    } catch (e: any) {
      message.error(await extractSdkResponseErrorMsg(e))
    }
  }

  watch(
    () => table.title,
    (title) => {
      table.table_name = `${title}`
    },
  )

  const generateUniqueTitle = () => {
    let c = 1
    while (tables?.value?.some((t) => t.title === `Sheet${c}`)) {
      c++
    }
    table.title = `Sheet${c}`
  }

  const deleteTable = (table: TableType) => {
    $e('c:table:delete')
    // 'Click Submit to Delete The table'
    Modal.confirm({
      title: `${t('msg.info.deleteTableConfirmation')} : ${table.title}?`,
      wrapClassName: 'nc-modal-table-delete',
      okText: t('general.yes'),
      okType: 'danger',
      cancelText: t('general.no'),
      async onOk() {
        try {
          const meta = (await getMeta(table.id as string, true)) as TableType
          const relationColumns = meta?.columns?.filter((c) => c.uidt === UITypes.LinkToAnotherRecord)

          if (relationColumns?.length) {
            const refColMsgs = await Promise.all(
              relationColumns.map(async (c, i) => {
                const refMeta = (await getMeta(
                  (c?.colOptions as LinkToAnotherRecordType)?.fk_related_model_id as string,
                )) as TableType
                return `${i + 1}. ${c.title} is a LinkToAnotherRecord of ${(refMeta && refMeta.title) || c.title}`
              }),
            )
            message.info(
              h('div', {
                innerHTML: `<div style="padding:10px 4px">Unable to delete tables because of the following.
              <br><br>${refColMsgs.join('<br>')}<br><br>
              Delete them & try again</div>`,
              }),
            )
            return
          }

          await $api.dbTable.delete(table?.id as string)

          await closeTab({
            type: TabType.TABLE,
            id: table.id,
            title: table.title,
          })

          await loadTables()

          removeMeta(table.id as string)
          // Deleted table successfully
          message.info(t('msg.info.tableDeleted'))
          $e('a:table:delete')
        } catch (e: any) {
          message.error(await extractSdkResponseErrorMsg(e))
        }
      },
    })
  }

  return { table, createTable, generateUniqueTitle, tables, project, deleteTable }
}
