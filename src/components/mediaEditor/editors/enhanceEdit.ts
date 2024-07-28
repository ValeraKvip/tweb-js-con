/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2024 kvip
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import BaseEdit from "./baseEdit";
import { MediaEditorRangeSelector } from "../utils/mediaEditorRangeSelector";
import AppMediaEditor from "../../appMediaEditor";
import { FilterTransforms } from "../utils/mediaUndoRedo";
import { FilterSettings } from "../utils/imageProcessor";


export default class EnhanceEdit extends BaseEdit {

  constructor(appMediaEditor: AppMediaEditor) {
    super(appMediaEditor);

    this.container = document.createElement('div');
    this.container.classList.add('enhance-editor');
    let settingsSnap: FilterSettings;

    const getCurrentSettings = () => {
      return {
        brightness: (brightnessRange.value) / 100,
        contrast: (contrastRange.value) / 100,
        saturation: (saturationRange.value) / 100,
        warmth: (warmthRange.value) / 100,
        fade: (fadeRange.value) / 100,
        grain: (grainRange.value) / 100,
        sharpen: (sharpenRange.value) / 100,
        vignette: (vignetteRange.value) / 100,
        shadow: (shadowsRange.value) / 100,
        highlight: (highlightRange.value) / 100,
        enhance: (enhanceRange.value) / 100,
      }
    }
    const update = () => {    
      const settings = getCurrentSettings();
      this.baseLayer.updateEnhance(settings);
      return settings;
    }


    const updateFinished = () => {

      this.do(async (transforms) => {
        let startSnap = settingsSnap;
        let finishSnap: FilterSettings;
        const _t = (transforms as FilterTransforms);
        if (_t?.filterTransforms) {
          finishSnap = _t.filterTransforms;
          this.baseLayer.updateEnhance(_t.filterTransforms);
          updateRangesUI(_t.filterTransforms);
        }
        else (
          finishSnap = update()
        )
        settingsSnap = finishSnap;

        //undo
        return async () => {
          settingsSnap = startSnap
          this.baseLayer.updateEnhance(startSnap);
          updateRangesUI(startSnap);

          //redo
          return () => {
            return {
              filterTransforms: finishSnap
            } as FilterTransforms;
          }
        }
      })
    }


    const updateRangesUI = (settings: FilterSettings) => {
      enhanceRange.setProgress(settings.enhance * 100);
      brightnessRange.setProgress(settings.brightness * 100);
      contrastRange.setProgress(settings.contrast * 100);
      saturationRange.setProgress(settings.saturation * 100);
      warmthRange.setProgress(settings.warmth * 100);
      fadeRange.setProgress(settings.fade * 100);
      highlightRange.setProgress(settings.highlight * 100);
      shadowsRange.setProgress(settings.shadow * 100);
      vignetteRange.setProgress(settings.vignette * 100);
      grainRange.setProgress(settings.grain * 100);
      sharpenRange.setProgress(settings.sharpen * 100);
    }

    const enhanceRange = new MediaEditorRangeSelector('MediaEditor.Enhance.Enhance', 1, 0, 0, 100);
    enhanceRange.onChange = update;
    enhanceRange.onEditFinished = updateFinished;

    const brightnessRange = new MediaEditorRangeSelector('MediaEditor.Enhance.Brightness', 1, 0, -100, 100, true);
    brightnessRange.onChange = update;
    brightnessRange.onEditFinished = updateFinished;

    const contrastRange = new MediaEditorRangeSelector('MediaEditor.Enhance.Contrast', 1, 0, -100, 100, true);
    contrastRange.onChange = update
    contrastRange.onEditFinished = updateFinished;

    const saturationRange = new MediaEditorRangeSelector('MediaEditor.Enhance.Saturation', 1, 0, -100, 100, true);
    saturationRange.onChange = update;
    saturationRange.onEditFinished = updateFinished;

    const warmthRange = new MediaEditorRangeSelector('MediaEditor.Enhance.Warmth', 1, 0, -100, 100, true);
    warmthRange.onChange = update;
    warmthRange.onEditFinished = updateFinished;

    const fadeRange = new MediaEditorRangeSelector('MediaEditor.Enhance.Fade', 1, 0, 0, 100);
    fadeRange.onChange = update;
    fadeRange.onEditFinished = updateFinished;

    const highlightRange = new MediaEditorRangeSelector('MediaEditor.Enhance.Highlights', 1, 0, -100, 100, true);
    highlightRange.onChange = update;
    highlightRange.onEditFinished = updateFinished;

    const shadowsRange = new MediaEditorRangeSelector('MediaEditor.Enhance.Shadows', 1, 0, -100, 100, true);
    shadowsRange.onChange = update;
    shadowsRange.onEditFinished = updateFinished;

    const vignetteRange = new MediaEditorRangeSelector('MediaEditor.Enhance.Vignette', 1, 0, 0, 100);
    vignetteRange.onChange = update;
    vignetteRange.onEditFinished = updateFinished;

    const grainRange = new MediaEditorRangeSelector('MediaEditor.Enhance.Grain', 1, 0, 0, 100,);
    grainRange.onChange = update;
    grainRange.onEditFinished = updateFinished;

    const sharpenRange = new MediaEditorRangeSelector('MediaEditor.Enhance.Sharpen', 1, 0, 0, 100);
    sharpenRange.onChange = update;
    sharpenRange.onEditFinished = updateFinished;

    this.container.append(
      enhanceRange.container,
      brightnessRange.container,
      contrastRange.container,
      saturationRange.container,
      warmthRange.container,
      fadeRange.container,
      highlightRange.container,
      shadowsRange.container,
      vignetteRange.container,
      grainRange.container,
      sharpenRange.container);

    settingsSnap = getCurrentSettings();
  }
}