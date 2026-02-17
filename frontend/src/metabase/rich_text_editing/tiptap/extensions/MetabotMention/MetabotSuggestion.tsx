import { useClickOutside } from "@mantine/hooks";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { t } from "ttag";

import {
  EntityPickerModal,
  MiniPicker,
  type OmniPickerItem,
} from "metabase/common/components/Pickers";
import { shouldDisableItemNotInDb } from "metabase/common/components/Pickers/DataPicker";
import type {
  MiniPickerItem,
  MiniPickerPickableItem,
} from "metabase/common/components/Pickers/MiniPicker/types";
import type { DatabaseId } from "metabase-types/api";

import { ExternalMenuTarget } from "../shared/ExternalMenuTarget";
import type { SuggestionModel } from "../shared/types";
import type { EntitySearchOptions } from "../shared/useEntitySearch";
import type {
  BareSuggestionRendererProps,
  BareSuggestionRendererRef,
} from "../suggestionRenderer";

import type { MentionProps } from "./MetabotMentionExtension";

interface MetabotMentionSuggestionPropsBase {
  searchModels?: SuggestionModel[];
  searchOptions?: EntitySearchOptions;
  onlyDatabaseId?: DatabaseId;
  isCompact?: boolean;
}
export type MetabotMentionSuggestionProps = MetabotMentionSuggestionPropsBase &
  BareSuggestionRendererProps<unknown, MentionProps>;

const MetabotMentionSuggestionComponent = forwardRef<
  BareSuggestionRendererRef,
  MetabotMentionSuggestionProps
>(function MentionSuggestionComponent(
  {
    items: _items,
    command,
    editor,
    range: _range,
    query,
    searchModels,
    onlyDatabaseId,
    decorationNode,
    onClose,
    isCompact,
  },
  ref,
) {
  const [isBrowsing, setIsBrowsing] = useState(false);

  const onSelectEntity = useCallback(
    (item: OmniPickerItem) => {
      command({
        id: item.id,
        model: item.model,
        label: item.name,
      });
    },
    [command],
  );

  const [isTrappingFocus, setIsTrappingFocus] = useState(false);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        setIsTrappingFocus(true);
        return true;
      }
      if (event.key === "Escape") {
        onClose();
        return true;
      }
      setIsTrappingFocus(false);
      return false;
    },
  }));

  const searchModelsReal = searchModels?.filter(
    (model) =>
      model !== "database" &&
      model !== "action" &&
      model !== "segment" &&
      model !== "user",
  );

  const shouldHide = useMemo(() => {
    const shouldDisableBasedOnDb = shouldDisableItemNotInDb(onlyDatabaseId);

    return (item: MiniPickerItem | unknown): item is MiniPickerPickableItem => {
      // @ts-expect-error - will fix when we align types with minipicker: UXW-2735
      const dbId = item?.db_id ?? item?.database_id ?? item?.dbId ?? undefined;

      return Boolean(
        // @ts-expect-error - Will be fixed once we align types with minipicker: UXW-2735
        shouldDisableBasedOnDb({ ...item, database_id: dbId }),
      );
    };
  }, [onlyDatabaseId]);

  const closeOnClickOutside = !isBrowsing;
  const [menuDropdownDom, setMenuDropdownDom] = useState<HTMLDivElement | null>(
    null,
  );
  const menuDropdownRef = useCallback((node: HTMLDivElement | null) => {
    setMenuDropdownDom(node);
  }, []);

  // Because `Menu.Target` is set to just the mention decoration node,
  // we need to have a custom "outside" definition to not close when clicking inside the editor.
  useClickOutside(
    () => {
      if (closeOnClickOutside) {
        onClose();
      }
    },
    ["mousedown", "touchstart"],
    [editor.view.dom, menuDropdownDom],
  );

  return (
    <>
      <MiniPicker
        opened
        searchQuery={query}
        shouldShowLibrary
        trapFocus={isTrappingFocus}
        models={searchModelsReal ?? []}
        closeOnClickOutside={false}
        onChange={onSelectEntity}
        onClose={() => {
          if (isTrappingFocus) {
            setIsTrappingFocus(false);
            editor.commands.focus();
          } else {
            onClose();
          }
        }}
        shouldHide={shouldHide}
        onBrowseAll={() => {
          setIsBrowsing(true);
        }}
        menuDropdownRef={menuDropdownRef}
        menuDropdownProps={{
          onBlur: () => {
            setIsTrappingFocus(false);
          },
          onFocus: () => {
            setIsTrappingFocus(true);
          },
          "aria-label": t`Metabot menu`,
        }}
        isCompact={isCompact}
      >
        <ExternalMenuTarget element={decorationNode} />
      </MiniPicker>
      {isBrowsing && (
        <EntityPickerModal
          title={t`Mention an item`}
          value={
            onlyDatabaseId
              ? {
                  model: "database",
                  id: onlyDatabaseId,
                }
              : undefined
          }
          models={searchModelsReal ?? []}
          options={{
            hasDatabases: true,
            hasRootCollection: true,
            hasPersonalCollections: true,
            hasSearch: true,
            hasRecents: true,
            hasLibrary: true,
            hasConfirmButtons: false,
            canCreateCollections: false,
            canCreateDashboards: false,
          }}
          onChange={(item) => {
            onSelectEntity(item);
            onClose();
          }}
          onClose={() => {
            setIsBrowsing(false);
            setIsTrappingFocus(false);
          }}
          isHiddenItem={shouldDisableItemNotInDb(onlyDatabaseId)}
          searchParams={
            onlyDatabaseId !== undefined
              ? {
                  table_db_id: onlyDatabaseId,
                }
              : undefined
          }
          searchQuery={query}
        />
      )}
    </>
  );
});

export const MetabotMentionSuggestion = MetabotMentionSuggestionComponent;

export const createMetabotMentionSuggestion = (
  outerProps: MetabotMentionSuggestionPropsBase,
) => {
  return forwardRef<BareSuggestionRendererRef, MetabotMentionSuggestionProps>(
    function MentionSuggestionWrapper(props, ref) {
      return <MetabotMentionSuggestion {...props} ref={ref} {...outerProps} />;
    },
  );
};
