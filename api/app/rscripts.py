import gc

import rpy2.robjects as robjects
from rpy2.robjects import pandas2ri
from rpy2.robjects.packages import importr
import pandas as pd
import numpy as np

WGCNA = importr('WGCNA')
pandas2ri.activate()


def goodSamplesGenes(expression_path):
    df = pd.read_csv(expression_path, index_col=0)
    gsg = WGCNA.goodSamplesGenes(df, verbose=0)
    badGenes = df.columns[[not x for x in gsg[0]]].tolist()
    badSamples = df.index[[not x for x in gsg[1]]].tolist()
    df.drop(badGenes, axis=1, inplace=True)
    df.drop(badSamples, axis=0, inplace=True)
    df.to_csv(expression_path)
    return {'allOK': gsg[2][0], 'badSamples': badSamples, 'badGenes': badGenes}


def tree_to_dict(df, tree, index=True, with_order=True):
    merge = pandas2ri.ri2py(tree[0]).tolist()
    height = list(tree[1])
    labels = df.index.tolist() if index else df.columns.tolist()
    order = pandas2ri.ri2py(tree[2]) - 1
    if index:
        ordered = df.index[order].tolist()
    else:
        ordered = df.columns[order].tolist()
    return {'merge': merge, 'height': height, 'labels': labels, 
        'ordered': ordered, 'order': order.tolist()}


def hclust(expression_path):
    df = pd.read_csv(expression_path, index_col=0)
    tree = robjects.r.hclust(robjects.r.dist(df), method = 'average')
    return tree_to_dict(df, tree)


def soft_tresholds(expression_path):
    df = pd.read_csv(expression_path, index_col=0)
    powers = list(range(1, 11)) + list(range(12, 21, 2))
    sft = WGCNA.pickSoftThreshold(df, powerVector = robjects.IntVector(powers), 
        networkType='signed', corFnc='bicor')[1]
    sft = pandas2ri.ri2py(sft)
    tresholds = {}
    tresholds['powers'] = powers
    tresholds['scaleindep'] = -np.sign(sft['slope']) * sft['SFT.R.sq']
    tresholds['meank'] = sft['mean.k.']
    return pd.DataFrame(tresholds)


def collect_garbage(object_name):
    gc.collect()
    robjects.r('rm({})'.format(object_name))
    robjects.r('gc()')
    gc.collect()


def tom(expression_path, diss_tom_path, power):
    df = pd.read_csv(expression_path, index_col=0)
    adjacency = WGCNA.adjacency(df, power=power, type='signed', corFnc='bicor')
    diss_tom = 1 - np.array(WGCNA.TOMsimilarity(adjacency, TOMType='signed'))
    np.savetxt(diss_tom_path, diss_tom)
    tree = robjects.r.hclust(robjects.r['as.dist'](diss_tom), method='average')
    return tree_to_dict(df, tree, index=False)


def cut_genes(cluster_data, diss_tom_path, min_module_size):
    tree = robjects.Vector([
        np.array(cluster_data['merge']),
        robjects.FloatVector(cluster_data['height']),
        robjects.IntVector(cluster_data['order'])
    ])
    tree.names = ['merge', 'height', 'order']
    diss_tom = np.loadtxt(diss_tom_path)
    modules = robjects.r.cutreeHybrid(dendro=tree, distM=diss_tom, deepSplit=2,
        pamRespectsDendro=False, minClusterSize=min_module_size)
    colors = WGCNA.labels2colors(modules[0])
    rgb = robjects.r.col2rgb(colors)
    hex = robjects.r.rgb(rgb.rx(1, True), rgb.rx(2, True), 
        rgb.rx(3, True), maxColorValue=255)
    return {'modules': list(colors), 'hex': list(hex)}
