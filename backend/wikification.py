import json
import logging
import numpy as np
from functools import partial
import rltk.similarity as sim
import os
from abc import ABC, abstractmethod
import pandas as pd
from t2wml.spreadsheets.conversions import cell_range_str_to_tuples

FILE_FOLDER=os.path.abspath(os.path.dirname(__file__))

def word_tokenizer(s):
    return s.split(' ')


def ngram_tokenizer(s, n, keep_start_and_end=False):
    n = int(n)
    keep_start_and_end = bool(keep_start_and_end)

    if keep_start_and_end:
        s = '_{}_'.format(s.lower())
    if len(s) < n:
        return [s]
    return [s[i:i + n] for i in range(len(s) - n + 1)]


def get_tokenizer(name, **kwargs):
    tokenizer = {
        'ngram': ngram_tokenizer,
        'word': word_tokenizer
    }[name]
    return partial(tokenizer, **kwargs)


class StringSimilarityModule(ABC):
    def __init__(self, tl_args, **method_args):
        # tl_args is necessary if operation specification (like case sensitive) is needed
        # kwargs is necessary if tokenization (need all data in df) is needed
        # set tl args
        self._ignore_case = tl_args['ignore_case']

        # set method args
        tokenizer_kwargs = {}
        for k, v in method_args.items():
            setattr(self, '_{}'.format(k), v)
            if k.startswith('tokenizer_'):
                tokenizer_kwargs[k[len('tokenizer_'):]] = v
        self._arg_str = ','.join(['{}={}'.format(k, v) for k, v in method_args.items()])

        if hasattr(self, '_tokenizer'):
            self._tokenize = get_tokenizer(self._tokenizer, **tokenizer_kwargs)

    def get_name(self) -> str:
        # return the module name and corresponding config
        # for example: "ngram:n=3"
        return '{}({})'.format(self.__class__.__name__, self._arg_str)

    def similarity(self, str1: str, str2: str, threshold=0) -> float:
        # return the similarity score, if the similarity score is lower than threshold, return 0
        if self._ignore_case:
            str1 = str1.lower()
            str2 = str2.lower()
        if hasattr(self, '_tokenize'):
            str1 = self._tokenize(str1)
            str2 = self._tokenize(str2)
        similarity = self._similarity(str1, str2)
        # if the score less than some threshold, return 0
        if threshold > similarity:
            return 0
        return similarity

    @abstractmethod
    def _similarity(self, str1: str, str2: str) -> float:
        # detail implementation of the method
        raise NotImplementedError


class HybridJaccardSimilarity(StringSimilarityModule):
    # hybrid_jaccard:tokenizer=word

    def __init__(self, tl_args, **kwargs):
        super().__init__(tl_args, **kwargs)

    def _similarity(self, str1: list, str2: list):
        return sim.hybrid_jaccard_similarity(set(str1), set(str2))


class DatamartCountryWikifier:
    def __init__(self, cache_file: str = None):
        self.similarity_unit = HybridJaccardSimilarity(tl_args={"ignore_case": True}, tokenizer="word")
        self._logger = logging.getLogger(__name__)
        if cache_file is None:
            cache_file =  os.path.join(FILE_FOLDER, "country_wikifier_cache.json")
        if not os.path.exists(cache_file):
            raise ValueError("Country wikifier cache file not exist at {}!".format(cache_file))
        with open(cache_file, "r", encoding="utf-8") as f:
            self.memo = json.load(f)

    def save(self, loc: str = None) -> None:
        """
            save current wikifier file for further using
        """
        if loc is None:
            loc = os.path.join(FILE_FOLDER, "country_wikifier_cache.json")
        with open(loc, "r") as f:
            json.dump(self.memo, f)

    def wikify(self, input_countries: list) -> dict:
        no_wifiy_memo = set()
        wikifier_result = []
        wikified = {}
        for each in input_countries:
            if isinstance(each, str) or not np.isnan(each):
                # skip those input we already confirm no candidate
                if each in no_wifiy_memo:
                    wikifier_result.append("")
                    continue

                input_str = " ".join(str(each).lower().strip().split())
                input_str_processed = " ".join(
                    input_str.replace("&", "and").replace("-", " ").replace(".", " ").replace(",", " ").strip().split())
                input_str_processed_no_bracket = input_str.split("(")[0].strip()
                # if not exact match, try use hybrid jaccard (for now) to get the highest similarity candidate
                if input_str not in self.memo and \
                        input_str_processed not in self.memo and \
                        input_str_processed_no_bracket not in self.memo:
                    # if not exact matched and the length is less than 4, ignore it
                    if len(input_str) < 4:
                        no_wifiy_memo.add(each)
                        wikifier_result.append("")
                        continue

                    self._logger.warning("`{}` not in record, will try to find the closest result".format(each))
                    highest_score = 0
                    best_res = ""
                    for each_candidate in self.memo.keys():
                        score = self.similarity_unit.similarity(input_str, each_candidate)
                        if score > highest_score:
                            best_res = each_candidate
                            highest_score = score

                    if highest_score > 0:
                        self._logger.info("get best match: `{}` with score `{}`".format(best_res, highest_score))
                        if highest_score > 0.9:
                            self._logger.info("will add `{}` to memo as `{}`".format(input_str, best_res))
                            wikified[each] = self.memo[best_res]

                        else:
                            no_wifiy_memo.add(each)
                            wikified[each] = None
                            self._logger.warning("Not wikify for input value `{}`".format(each))
                else:
                    wikified[each] = self.memo.get(input_str, None) or self.memo.get(input_str_processed,
                                                                                     None) or self.memo.get(
                        input_str_processed_no_bracket, None)

        return wikified

    def wikify_region(self, cell_range: str, sheet):
        (start_col, start_row), (end_col, end_row) = cell_range_str_to_tuples(cell_range)
        end_col += 1
        end_row += 1

        row_offset = start_row
        columns = ",".join([str(i) for i in range(start_col, end_col)])
        #rows=",".join([str(i) for i in range(start_row, end_row)])
        cell_qnode_map = dict()
        payload = {
            'columns': columns,
            #    'rows':rows,
            'case_sensitive': 'false'
        }

        sheet_data = sheet[start_row:end_row]
        flattened_sheet_data = sheet[start_row:end_row,
                                     start_col:end_col].to_numpy().flatten()

        result_dict = self.wikify(flattened_sheet_data)

        df_rows = []
        for value, item in result_dict.items():
            df_rows.append(["", "", value, "", item, "", ""])
        df = pd.DataFrame(df_rows, columns=[
                        "column", "row", "value", "context", "item", "file", "sheet"])

        return df, []



def wikify_countries(calc_params, region):
    #convenience function
    dcw=DatamartCountryWikifier()
    df, problem_cells = dcw.wikify_region(region, calc_params.sheet)
    return df, problem_cells
